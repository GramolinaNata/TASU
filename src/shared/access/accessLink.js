// Одноразовые ссылки для наёмных водителей и представителей.
//
// ТЗ: наёмному водителю не заводят учётку и кабинет — ему присылают ссылку.
// Открыл, сменил статус груза (или подписал), ссылка погасла.
//
// ТРИ ПРЕДОХРАНИТЕЛЯ, а не один:
//   срок      — ссылка живёт ограниченное время (по умолчанию 3 дня:
//               рейсы междугородние, суток мало);
//   однократность — гасится ПЕРВЫМ ДЕЙСТВИЕМ, а не открытием. Водитель может
//               открыть карточку, отвлечься, перезагрузить страницу — ссылка
//               обязана пережить это. Гасить на просмотр значит ломать её
//               в самом обычном сценарии;
//   отзыв     — менеджер может погасить ссылку досрочно.
//
// ⚠️ ЗЕРКАЛО СЕРВЕРА: server/src/controllers/request.controller.ts. Правила
// проверяются НА СЕРВЕРЕ — здесь они нужны для показа состояния в интерфейсе.
// Общий модуль сделать нельзя: образ бэка собирается из server/ и до src/
// не достаёт.

/** Зачем выдана ссылка. */
export const LINK_PURPOSE = {
  CARGO: 'cargo',   // сменить статус движения груза
  SIGN: 'sign',     // подписать СМР (подпись получателя)
};

/** Варианты срока при выдаче. По умолчанию 3 дня. */
export const TTL_OPTIONS = [
  { days: 1, label: '1 день' },
  { days: 3, label: '3 дня' },
  { days: 7, label: '7 дней' },
];
export const DEFAULT_TTL_DAYS = 3;

export const PURPOSE_LABELS = {
  [LINK_PURPOSE.CARGO]: 'Статус груза (водитель)',
  [LINK_PURPOSE.SIGN]: 'Подпись получателя',
};

/** Состояние ссылки: active | used | revoked | expired. */
export function linkState(entry, now = Date.now()) {
  if (!entry || typeof entry !== 'object') return 'revoked';
  if (entry.revokedAt) return 'revoked';
  if (entry.usedAt) return 'used';
  const exp = entry.expiresAt ? Date.parse(entry.expiresAt) : NaN;
  if (Number.isFinite(exp) && exp <= now) return 'expired';
  return 'active';
}

export function isLinkUsable(entry, now = Date.now()) {
  return linkState(entry, now) === 'active';
}

export const LINK_STATE_LABELS = {
  active: 'Активна',
  used: 'Использована',
  revoked: 'Отозвана',
  expired: 'Истекла',
};

/** Путь страницы по назначению ссылки. */
export function linkPath(purpose, token) {
  const base = purpose === LINK_PURPOSE.SIGN ? '/sign' : '/t';
  return `${base}/${token}`;
}

export function buildLinkUrl(origin, purpose, token) {
  const o = String(origin || '').replace(/\/+$/, '');
  return `${o}${linkPath(purpose, token)}`;
}

/** Дата окончания по числу дней — для показа в диалоге выдачи. */
export function expiryFromNow(days, now = Date.now()) {
  const d = Number(days) > 0 ? Number(days) : DEFAULT_TTL_DAYS;
  return new Date(now + d * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Что видно ПО ПУБЛИЧНОЙ ССЫЛКЕ.
 *
 * Ссылка уходит в мессенджер наёмному водителю и дальше живёт вне нашего
 * контроля, поэтому выдача урезана до необходимого для работы:
 * номер, направление, АДРЕС ВЫГРУЗКИ (он туда везёт), места, вес, статус.
 *
 * НЕ отдаём: суммы, ФИО и телефоны сторон, реквизиты, состав груза по позициям.
 *
 * ⚠️ Функция описывает КОНТРАКТ выдачи; фактическую урезку делает сервер —
 * здесь она продублирована, чтобы правило было видно и проверяемо тестами.
 */
export function publicCargoView(act, details = {}) {
  const route = details.route || {};
  const totals = details.totals || {};
  return {
    id: act?.id || '',
    docNumber: act?.docNumber || act?.number || '',
    fromCity: route.fromCity || '',
    toCity: route.toCity || '',
    unloadingAddress: route.toAddress || '',
    seats: Number(totals.seats) || 0,
    weight: Number(totals.weight) || 0,
    cargoStatus: act?.cargoStatus || '',
    cargoStatusAt: act?.cargoStatusAt || null,
  };
}

/** Поля, которых в публичной выдаче быть НЕ ДОЛЖНО — для проверки в тестах. */
export const FORBIDDEN_PUBLIC_FIELDS = [
  'totalSum', 'customer', 'receiver', 'sender', 'details',
  'company', 'companyId', 'managerId', 'services', 'warehouseServices',
];
