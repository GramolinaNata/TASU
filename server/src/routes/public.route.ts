import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';
// Цепочка подписей. Зеркало src/shared/sign/signChain.js — см. комментарий там.
import {
  SIGN_ROLE, isKnownSignRole, signHeading, signHint,
  canSign, putSignature, hasDocument,
} from '../lib/signChain';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tasu_super_secret_key_123';

router.get('/acts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[PUBLIC API] Fetching act with ID: ${id}`);

    // Попытка получить токен для проверки авторизации
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let isAuthenticated = false;

    if (token) {
        try {
            jwt.verify(token, JWT_SECRET);
            isAuthenticated = true;
        } catch (e) { /* Игнорируем ошибку, просто считаем гостем */ }
    }

    const request = await prisma.request.findUnique({
      where: { id: id as string },
      include: {
        company: true,
        manager: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    // Если не авторизован, скрываем сумму в поле details
    if (!isAuthenticated && request.details) {
        try {
            const details = JSON.parse(request.details);
            if (details.totalSum) {
                delete details.totalSum;
                request.details = JSON.stringify(details);
            }
        } catch (e) {
            console.error('[PUBLIC API] Error parsing/cleaning details:', e);
        }
    }

    res.json(request);
  } catch (error: any) {
    console.error('Public get request error:', error);
    res.status(500).json({ message: 'Ошибка при получении заявки', details: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ТЗ: одноразовые ссылки для наёмных водителей и представителей.
//
// Учёток и кабинетов у них нет — им присылают ссылку. Открыл, сменил статус
// груза (или подписал), ссылка погасла.
//
// ТРИ ПРЕДОХРАНИТЕЛЯ: срок, однократность, отзыв. Гасим НЕ на открытие,
// а на ДЕЙСТВИЕ: водитель может открыть карточку, отвлечься, перезагрузить
// страницу — ссылка обязана это пережить. Гашение на просмотр ломало бы её
// в самом обычном сценарии.
//
// ⚠️ ЗЕРКАЛО ФРОНТА: src/shared/access/accessLink.js — правила состояния
// ссылки продублированы там для показа в интерфейсе. Общий модуль сделать
// нельзя: образ бэка собирается из server/ и до src/ не достаёт.
// ─────────────────────────────────────────────────────────────────────────────

// ОПОРНАЯ цепочка. По ссылке доступны ТОЛЬКО эти четыре шага, хотя полный
// маршрут (request.controller.CARGO_FLOW) теперь длиннее: складские отметки и
// передачи между курьерами — внутренняя кухня, наёмному водителю по ссылке их
// показывать нечего, да и ставить их некому. Список совпадает с CARGO_CHAIN
// на фронте (src/shared/cargo/cargoStatus.js).
const CARGO_CHAIN_PUB = ['picked_up', 'loaded', 'rep_received', 'delivered'];

/** Журнал движения: колонка Json, у старых записей — null. */
function parseCargoEvents(raw: any): any[] {
  if (Array.isArray(raw)) return raw.filter((e) => e && typeof e === 'object');
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((e: any) => e && typeof e === 'object') : [];
    } catch {
      return [];
    }
  }
  return [];
}

function nextCargoPub(current: string): string | null {
  const cur = current && CARGO_CHAIN_PUB.includes(current) ? current : '';
  if (cur === '') return CARGO_CHAIN_PUB[0];
  const i = CARGO_CHAIN_PUB.indexOf(cur);
  return i < CARGO_CHAIN_PUB.length - 1 ? CARGO_CHAIN_PUB[i + 1] : null;
}

function parseTokens(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

function safeDetails(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(String(raw)); } catch { return {}; }
}

/**
 * Найти накладную по токену и проверить пригодность ссылки.
 * Возвращает либо { request, entry }, либо { error, code }.
 */
async function resolveToken(token: string, purpose: string): Promise<any> {
  if (!token) return { error: 'Ссылка не распознана', code: 400 };

  // Токены лежат в JSON-поле, поэтому ищем перебором записей, у которых они
  // вообще есть. Накладных немного, а индекс по элементу JSON-массива в
  // Postgres здесь не окупается.
  const all = await prisma.request.findMany({
    where: { NOT: { accessTokens: { equals: null as any } } },
  });

  for (const r of all) {
    const entry = parseTokens((r as any).accessTokens).find((t: any) => t && t.token === token);
    if (!entry) continue;
    if (entry.purpose !== purpose) return { error: 'Ссылка не предназначена для этого действия', code: 403 };
    if (entry.revokedAt) return { error: 'Ссылка отозвана', code: 410 };
    if (entry.usedAt) return { error: 'Ссылка уже использована', code: 410 };
    const exp = entry.expiresAt ? Date.parse(entry.expiresAt) : NaN;
    if (Number.isFinite(exp) && exp <= Date.now()) return { error: 'Срок действия ссылки истёк', code: 410 };
    return { request: r, entry };
  }
  return { error: 'Ссылка не найдена', code: 404 };
}

/** Погасить ссылку и записать результат действия одной транзакцией смысла. */
async function burnToken(requestId: string, token: string, extra: any = {}) {
  const r = await prisma.request.findUnique({ where: { id: requestId } });
  const tokens = parseTokens((r as any)?.accessTokens).map((t: any) =>
    t && t.token === token ? { ...t, usedAt: new Date().toISOString() } : t
  );
  await prisma.request.update({
    where: { id: requestId },
    data: { accessTokens: tokens as any, ...extra },
  });
}

/**
 * Карточка груза по ссылке — УРЕЗАННАЯ.
 *
 * Ссылка уходит в мессенджер наёмному водителю и дальше живёт вне нашего
 * контроля. Отдаём только нужное для работы: номер, направление, АДРЕС
 * ВЫГРУЗКИ (он туда везёт), места, вес, статус. Ни сумм, ни ФИО сторон,
 * ни телефонов, ни состава груза, ни адреса загрузки.
 */
router.get('/cargo/:token', async (req: Request, res: Response) => {
  try {
    const r = await resolveToken(String(req.params.token), 'cargo');
    if (r.error) return res.status(r.code).json({ message: r.error });
    const act: any = r.request;
    const d = safeDetails(act.details);
    res.json({
      docNumber: act.docNumber || '',
      fromCity: d.route?.fromCity || '',
      toCity: d.route?.toCity || '',
      unloadingAddress: d.route?.toAddress || '',
      seats: Number(d.totals?.seats) || 0,
      weight: Number(d.totals?.weight) || 0,
      cargoStatus: act.cargoStatus || '',
      cargoStatusAt: act.cargoStatusAt || null,
    });
  } catch (e: any) {
    console.error('public cargo error:', e);
    res.status(500).json({ message: 'Ошибка получения данных' });
  }
});

/** Смена статуса груза по ссылке. Порядок цепочки проверяется как у своих. */
router.post('/cargo/:token/status', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const r = await resolveToken(token, 'cargo');
    if (r.error) return res.status(r.code).json({ message: r.error });

    const act: any = r.request;
    const target = String(req.body?.cargoStatus || '');
    const current = String(act.cargoStatus || '');

    if (!CARGO_CHAIN_PUB.includes(target)) {
      return res.status(400).json({ message: 'Неизвестный статус груза' });
    }
    // По ссылке разрешён ТОЛЬКО следующий шаг: отката у наёмного водителя нет,
    // иначе одноразовость теряет смысл.
    if (target !== nextCargoPub(current)) {
      return res.status(400).json({
        message: 'Нельзя перескочить шаг цепочки движения груза',
        expected: nextCargoPub(current),
      });
    }

    // Журнал движения. У наёмного водителя учётки нет, поэтому автор
    // записывается как ссылка: byRole 'LINK' и хвост токена — этого хватает,
    // чтобы в истории было видно, какой именно выдачей отмечен шаг, и при этом
    // сам токен целиком в журнал не попадает.
    const events = parseCargoEvents(act.cargoEvents);
    events.push({
      status: target,
      at: new Date().toISOString(),
      byId: null,
      byName: 'по ссылке …' + token.slice(-6),
      byRole: 'LINK',
      back: false,
    });

    await burnToken(act.id, token, { cargoStatus: target, cargoStatusAt: new Date(), cargoEvents: events });
    res.json({ ok: true, cargoStatus: target });
  } catch (e: any) {
    console.error('public cargo status error:', e);
    res.status(500).json({ message: 'Ошибка смены статуса' });
  }
});

/**
 * Роль подписи, закреплённая за ссылкой.
 *
 * ⚠️ СОВМЕСТИМОСТЬ СО СТАРЫМИ ССЫЛКАМИ. У выданных до появления цепочки
 * записей токена поля signRole нет вовсе — тогда подпись была одна. Такие
 * ссылки обязаны продолжать работать ровно как раньше, поэтому умолчание —
 * 'receiver'. Менять умолчание нельзя: ссылка уже у человека в мессенджере.
 */
function signRoleOf(entry: any): string {
  const role = String(entry?.signRole || '');
  return isKnownSignRole(role) ? role : SIGN_ROLE.RECEIVER;
}

/** Данные для страницы подписи — тот же урезанный состав. */
router.get('/sign/:token', async (req: Request, res: Response) => {
  try {
    const r = await resolveToken(String(req.params.token), 'sign');
    if (r.error) return res.status(r.code).json({ message: r.error });
    const act: any = r.request;
    const d = safeDetails(act.details);
    const role = signRoleOf(r.entry);

    // Порядок цепочки проверяем и на показе: если ссылку выдали заранее, а
    // предыдущая ступень ещё не подписана, человек должен увидеть причину,
    // а не пустую канву, которая потом откажется отправляться.
    const gate = canSign(act, role);

    res.json({
      docNumber: act.docNumber || '',
      fromCity: d.route?.fromCity || '',
      toCity: d.route?.toCity || '',
      unloadingAddress: d.route?.toAddress || '',
      seats: Number(d.totals?.seats) || 0,
      weight: Number(d.totals?.weight) || 0,
      // Что именно подписывают — иначе человек ставит подпись вслепую.
      signRole: role,
      heading: signHeading(role),
      hint: signHint(role),
      docKind: hasDocument(act) ? String(act.docType || act.type || '').toUpperCase() : '',
      blocked: !gate.ok,
      blockedReason: gate.reason || '',
    });
  } catch (e: any) {
    console.error('public sign get error:', e);
    res.status(500).json({ message: 'Ошибка получения данных' });
  }
});

/**
 * Сохранение подписи.
 *
 * РАНЬШЕ ЗДЕСЬ БЫЛ ХАРДКОД: роль всегда писалась как 'receiver' и по ней же
 * фильтровался прежний массив. Колонка signatures изначально рассчитана на
 * несколько подписей, но пользовалась одной. Теперь роль берётся из записи
 * токена, а старые ссылки без этого поля по-прежнему подписывают как
 * получатель (см. signRoleOf).
 */
router.post('/sign/:token', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const r = await resolveToken(token, 'sign');
    if (r.error) return res.status(r.code).json({ message: r.error });

    const act: any = r.request;
    const image = String(req.body?.image || '');
    const name = String(req.body?.name || '').trim();

    if (image.indexOf('data:image/png;base64,') !== 0) {
      return res.status(400).json({ message: 'Подпись не распознана' });
    }
    // Канва подписи весит десятки килобайт. Сотни — значит прислали не подпись,
    // и класть это в базу не нужно.
    if (image.length > 700000) {
      return res.status(413).json({ message: 'Изображение подписи слишком большое' });
    }

    const role = signRoleOf(r.entry);

    // Порядок цепочки проверяется НА СЕРВЕРЕ: ссылку могли выдать заранее,
    // а подпись документа, которого ещё нет, подтверждает пустоту.
    const gate = canSign(act, role);
    if (!gate.ok) {
      return res.status(409).json({ message: gate.reason || 'Сейчас подписывать нельзя' });
    }

    // putSignature заменяет подпись СВОЕЙ роли и не трогает остальные:
    // переподписал по новой ссылке — в документе одна подпись, а не две.
    const signatures = putSignature(act.signatures, {
      role, name, image, signedAt: new Date().toISOString(), token,
    });

    await burnToken(act.id, token, { signatures: signatures as any });
    res.json({ ok: true, signRole: role });
  } catch (e: any) {
    console.error('public sign post error:', e);
    res.status(500).json({ message: 'Ошибка сохранения подписи' });
  }
});

export default router;
