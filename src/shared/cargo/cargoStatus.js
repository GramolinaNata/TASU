// Статус движения груза (сканирование QR).
//
// ЗАЧЕМ ОТДЕЛЬНОЕ ПОЛЕ. Движение груза и состояние документа — РАЗНЫЕ оси.
// Груз может быть «на фуре», пока накладная «Обработана» и «Оплачена» — это не
// противоречие. Существующий Request.status держит рабочий процесс документа
// (act/sent/done/deferred/canceled), на нём стоят вкладки частных и фильтры
// разделов: запиши туда «Забрано» — и накладная выпадет из всех вкладок сразу.
// Поэтому движение груза живёт в своём поле Request.cargoStatus.
//
// В коде уже была попытка писать 'Забрано'/'Доставлено' прямо в status
// (CourierActViewPage). В базе таких значений нет ни одного — функцией не
// пользовались, и коллизия не всплыла. Здесь она закрыта по построению.

// ============================================================
// ПОЛНЫЙ МАРШРУТ ГРУЗА (ТЗ: кладовщик → местный курьер → фура → регион).
//
// КАК РАСШИРЯЛИ, НЕ СЛОМАВ ЕДУЩИЙ ГРУЗ. Четыре прежних шага остались на своих
// местах и остались ОБЯЗАТЕЛЬНЫМИ (опорными). Новые шаги вставлены между ними
// НЕОБЯЗАТЕЛЬНЫМИ. Это не уловка ради совместимости, а факт предметной
// области: не всякий груз проходит склад — часть едет от отправителя сразу на
// фуру, и требовать отметки склада для неё означало бы, что цепочку начнут
// проставлять задним числом «чтобы система пустила».
//
// Отсюда правило перехода: разрешён любой шаг вперёд, между которым и текущим
// лежат ТОЛЬКО необязательные шаги. На прежних четырёх статусах это правило
// даёт ровно прежнее поведение (между соседними опорными шагами лежат только
// новые необязательные), а перескок через опорный шаг по-прежнему запрещён.
//
// optional — шаг можно пропустить.
// entry    — шагом можно НАЧАТЬ цепочку, когда груз ещё «не в пути».
// roles    — кто вправе его поставить. COURIER, MANAGER и ADMIN есть в КАЖДОМ
//            шаге: это те, кто двигает груз сегодня, и ни одно действие,
//            доступное им раньше, не должно стать недоступным.
//
// ПРО ВХОДНЫЕ ШАГИ. Сначала цепочка начиналась только с «забран у отправителя»,
// и это оказалось неверно на первом же складе заказчика: у кладовщика не было
// НИ ОДНОЙ доступной кнопки, потому что весь груз лежал в статусе «не в пути».
// Груз попадает на склад двумя путями:
//   • курьер забрал у отправителя и привёз (picked_up → wh_accepted);
//   • КЛИЕНТ ПРИВЁЗ САМ — тогда первое событие и есть «принят на склад»,
//     никакого забора не было.
// Второй путь требовал, чтобы кто-то посторонний сначала отметил вымышленный
// «забор» — то есть соврал в журнале ради прохождения проверки. Поэтому
// приёмка на склад объявлена входным шагом наравне с забором.
// ============================================================
export const CARGO_FLOW = [
  { key: 'picked_up',    optional: false, entry: true, short: 'Забран у отправителя',      action: '📦 Забрал груз',
    roles: ['COURIER', 'MANAGER', 'ADMIN', 'OPS_MANAGER', 'COURIER_LOCAL'] },
  { key: 'wh_accepted',  optional: true,  entry: true, short: 'Принят на склад',           action: '🏬 Принял на склад',
    roles: ['COURIER', 'MANAGER', 'ADMIN', 'OPS_MANAGER', 'WAREHOUSE_KEEPER'] },
  { key: 'wh_released',  optional: true,  short: 'Отпущен со склада',         action: '📤 Отпустил со склада',
    roles: ['COURIER', 'MANAGER', 'ADMIN', 'OPS_MANAGER', 'WAREHOUSE_KEEPER'] },
  { key: 'courier_took', optional: true,  short: 'У местного курьера',        action: '🛵 Принял груз',
    roles: ['COURIER', 'MANAGER', 'ADMIN', 'OPS_MANAGER', 'COURIER_LOCAL'] },
  { key: 'loaded',       optional: false, short: 'Погружен на фуру',          action: '🚛 Погрузил на фуру',
    roles: ['COURIER', 'MANAGER', 'ADMIN', 'OPS_MANAGER', 'COURIER_LOCAL', 'WAREHOUSE_KEEPER'] },
  { key: 'in_transit',   optional: true,  short: 'В пути',                    action: '🛣️ Отправлен в путь',
    roles: ['COURIER', 'MANAGER', 'ADMIN', 'OPS_MANAGER', 'COURIER_REGION'] },
  { key: 'region_took',  optional: true,  short: 'У регионального курьера',   action: '🚐 Принял в регионе',
    roles: ['COURIER', 'MANAGER', 'ADMIN', 'OPS_MANAGER', 'COURIER_REGION'] },
  { key: 'rep_received', optional: false, short: 'У представителя',           action: '🤝 Представитель принял',
    roles: ['COURIER', 'MANAGER', 'ADMIN', 'OPS_MANAGER', 'COURIER_REGION'] },
  { key: 'delivered',    optional: false, short: 'Выдан получателю',          action: '🏁 Выдал получателю',
    roles: ['COURIER', 'MANAGER', 'ADMIN', 'OPS_MANAGER', 'COURIER_REGION'] },
];

const FLOW_BY_KEY = CARGO_FLOW.reduce((acc, s) => { acc[s.key] = s; return acc; }, {});
const flowIndex = (key) => CARGO_FLOW.findIndex((s) => s.key === key);

/**
 * ОПОРНЫЕ шаги — обязательные, в прежнем порядке.
 *
 * Значение вычисляется из CARGO_FLOW, но остаётся тем же списком из четырёх
 * статусов, что и раньше: на нём стоит полоса прогресса в ScanActPage и
 * PublicCargoPage, и «расширить» её сейчас значило бы показать наёмному
 * водителю по ссылке внутреннюю кухню склада. Полный маршрут — CARGO_FLOW.
 */
export const CARGO_CHAIN = CARGO_FLOW.filter((s) => !s.optional).map((s) => s.key);

/** Все шаги маршрута по порядку, включая необязательные. */
export const CARGO_FLOW_KEYS = CARGO_FLOW.map((s) => s.key);

export const CARGO_STATUS = {
  NONE: '',
  PICKED_UP: 'picked_up',
  WH_ACCEPTED: 'wh_accepted',
  WH_RELEASED: 'wh_released',
  COURIER_TOOK: 'courier_took',
  LOADED: 'loaded',
  IN_TRANSIT: 'in_transit',
  REGION_TOOK: 'region_took',
  REP_RECEIVED: 'rep_received',
  DELIVERED: 'delivered',
};

/** Подписи: в списке — короткая, на кнопке — действие. */
export const CARGO_LABELS = CARGO_FLOW.reduce(
  (acc, s) => { acc[s.key] = { short: s.short, action: s.action }; return acc; },
  { '': { short: 'Не в пути', action: '' } }
);

/**
 * Кто двигает груз СЕГОДНЯ — и одновременно роли с полным доступом ко всем
 * шагам маршрута.
 *
 * Список намеренно оставлен прежним. На нём стоит гейт страниц сканирования
 * (ScanPage, ScanActPage), а новые роли пока всё равно упираются в заглушку
 * /cabinet — расширять доступ к сканеру раньше, чем появятся их кабинеты,
 * значит открывать экран, которым некому пользоваться. Права новых ролей
 * описаны в CARGO_FLOW[].roles и включатся вместе с кабинетами.
 */
export const CARGO_ROLES = ['COURIER', 'MANAGER', 'ADMIN'];

/** Все роли, встречающиеся в маршруте, — включая новые. */
export const CARGO_ALL_ROLES = [...new Set(CARGO_FLOW.flatMap((s) => s.roles))];

/**
 * Кто вправе отменить шаг.
 *
 * Отмена нужна не «на будущее»: водитель сканирует наклейку на морозе, промах
 * по кнопке — обычное дело, а без отката груз навсегда останется «выданным».
 * Курьеру откат не даём — иначе смысл фиксации теряется. Операционный менеджер
 * добавлен: по ТЗ он контролирует все этапы, а контроль без права исправить
 * чужую ошибку — это не контроль.
 */
export const CARGO_REVERT_ROLES = ['MANAGER', 'ADMIN', 'OPS_MANAGER'];

// ============================================================
// КАРТА СТАРЫХ ЗНАЧЕНИЙ.
//
// Зачем она нужна, если четыре прежних шага остались в маршруте дословно.
//
//  1. ЯВНОЕ ОБЕЩАНИЕ. Тождественное отображение прежней четвёрки записано
//     здесь буквами и накрыто тестом. Пока это «само собой», но первый же
//     переименованный шаг обязан появиться в этой карте, а не тихо оборвать
//     историю едущего груза. Одно место для будущих переименований.
//
//  2. ПРОТЕЧКА ИЗ Request.status. До появления cargoStatus курьерский экран
//     писал движение груза ПРЯМО в статус документа значениями «Забрано» и
//     «Доставлено» (см. CourierActViewPage). В cargoStatus таких значений
//     быть не должно, но если хоть одна запись их получила, трактовать её
//     как «не в пути» — соврать: груз-то забрали.
//
//  3. ГРЯЗЬ. Регистр и пробелы: значение могло приехать из выгрузки или
//     из ручной правки базы.
//
// isKnownCargoStatus карту НЕ учитывает и остаётся строгой: «Забрано» —
// по-прежнему неизвестный статус, ставить его нельзя. Карта нужна для ЧТЕНИЯ
// того, что уже лежит в базе, а не для расширения списка допустимых значений.
// ============================================================
export const CARGO_LEGACY_MAP = {
  // Прежняя четвёрка — тождественно. Строки не менялись и меняться не должны.
  picked_up: 'picked_up',
  loaded: 'loaded',
  rep_received: 'rep_received',
  delivered: 'delivered',

  // Протечка из статуса документа.
  'забрано': 'picked_up',
  'доставлено': 'delivered',
};

/**
 * Привести значение из базы к шагу маршрута.
 * Не распознали — '' («не в пути»), как и раньше.
 */
export function normalizeCargoStatus(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (Object.prototype.hasOwnProperty.call(FLOW_BY_KEY, raw)) return raw;
  const mapped = CARGO_LEGACY_MAP[raw] || CARGO_LEGACY_MAP[raw.toLowerCase()];
  return mapped || '';
}

/**
 * Движение груза, выведенное из СТАТУСА ДОКУМЕНТА.
 *
 * Нужно ровно для старых записей, у которых cargoStatus пуст, потому что в те
 * времена поля ещё не было, а курьер отмечался в Request.status. Для новых
 * записей возвращает '' — выводить движение из рабочего процесса документа
 * нельзя, это разные оси (см. шапку модуля).
 */
export function cargoStatusFromDocStatus(docStatus) {
  const raw = String(docStatus ?? '').trim().toLowerCase();
  if (raw === 'забрано') return 'picked_up';
  if (raw === 'доставлено') return 'delivered';
  return '';
}

/**
 * Статусы ДОКУМЕНТА, при которых груз двигать нельзя.
 *
 * Аннулированная накладная — не работа: груза по ней нет, везти нечего.
 * Проверка появилась не «на всякий случай»: кабинет кладовщика показывал
 * аннулированные наравне с живыми (в его урезанной выдаче поля status нет
 * вовсе), и такую накладную успели провести через приёмку и отпуск склада.
 * В журнале остался след работы, которой не было.
 */
export const CARGO_BLOCKING_DOC_STATUSES = ['canceled'];

/**
 * Можно ли вообще работать с грузом этой накладной.
 * @returns {{ok: boolean, reason?: string}}
 */
export function isCargoWorkable(act) {
  const st = String(act?.status || '');
  if (CARGO_BLOCKING_DOC_STATUSES.includes(st)) {
    return { ok: false, reason: 'Накладная аннулирована — груз по ней не двигают' };
  }
  return { ok: true };
}

export function isKnownCargoStatus(value) {
  return value === '' || Object.prototype.hasOwnProperty.call(FLOW_BY_KEY, value);
}

export function cargoLabel(status) {
  return (CARGO_LABELS[status] || CARGO_LABELS['']).short;
}

export function cargoActionLabel(status) {
  return (CARGO_LABELS[status] || CARGO_LABELS['']).action;
}

/** Необязательный ли шаг. Неизвестный статус необязательным не считается. */
export function isOptionalCargoStep(status) {
  return !!FLOW_BY_KEY[status]?.optional;
}

/** Роли, которым разрешён конкретный шаг. */
export function rolesForCargoStep(status) {
  return FLOW_BY_KEY[status] ? [...FLOW_BY_KEY[status].roles] : [];
}

/** Вправе ли роль ставить этот шаг. */
export function canRoleSetStep(role, status) {
  return rolesForCargoStep(status).includes(role);
}

/** Двигает ли роль груз вообще (хоть один шаг маршрута). */
export function roleMovesCargo(role) {
  return CARGO_ALL_ROLES.includes(role);
}

/**
 * Следующий ОПОРНЫЙ шаг. null — груз уже выдан.
 *
 * Возвращает именно обязательный шаг, а не просто следующий по порядку: на эту
 * функцию завязаны кнопки «сделать следующий шаг» в сканере и по публичной
 * ссылке, и подставлять туда необязательную отметку склада нельзя — водитель
 * нажмёт её, не разобравшись. Необязательные шаги ставятся осознанно, из
 * кабинета своей роли; их список отдаёт allowedNextCargoStatuses.
 */
export function nextCargoStatus(current) {
  const cur = normalizeCargoStatus(current);
  const from = cur === '' ? -1 : flowIndex(cur);
  for (let i = from + 1; i < CARGO_FLOW.length; i++) {
    if (!CARGO_FLOW[i].optional) return CARGO_FLOW[i].key;
  }
  return null;
}

/** Предыдущий ОПОРНЫЙ шаг — для отмены ошибочного скана. */
export function prevCargoStatus(current) {
  const i = flowIndex(current);
  if (i < 0) return null;
  for (let k = i - 1; k >= 0; k--) {
    if (!CARGO_FLOW[k].optional) return CARGO_FLOW[k].key;
  }
  return '';
}

/**
 * Все шаги, которые СЕЙЧАС можно поставить вперёд: ближайший опорный плюс все
 * необязательные до него. Нужно кабинетам ролей — там выбор осознанный.
 */
export function allowedNextCargoStatuses(current, role) {
  const cur = normalizeCargoStatus(current);
  const from = cur === '' ? -1 : flowIndex(cur);
  const out = [];
  for (let i = from + 1; i < CARGO_FLOW.length; i++) {
    const step = CARGO_FLOW[i];
    // Недостижимый шаг просто пропускаем. Обрывать цикл нельзя: у груза «не в
    // пути» достижимы ДВА входных шага (забор и приёмка на склад), а между
    // ними лежит опорный — на нём прежний `break` и обрубал кладовщику
    // единственную его кнопку.
    if (!canReachForward(from, i)) continue;
    if (!role || step.roles.includes(role)) out.push(step.key);
  }
  return out;
}

/** Лежат ли между двумя позициями только необязательные шаги. */
function onlyOptionalBetween(fromIdx, toIdx) {
  const lo = Math.min(fromIdx, toIdx);
  const hi = Math.max(fromIdx, toIdx);
  for (let i = lo + 1; i < hi; i++) {
    if (!CARGO_FLOW[i].optional) return false;
  }
  return true;
}

/**
 * Достижим ли шаг toIdx вперёд из fromIdx (-1 = груз не в пути).
 *
 * Правило одно, с одним исключением: перескакивать можно только через
 * НЕОБЯЗАТЕЛЬНЫЕ шаги, а цепочку можно начать с любого ВХОДНОГО.
 */
function canReachForward(fromIdx, toIdx) {
  if (toIdx <= fromIdx) return false;
  if (fromIdx === -1 && CARGO_FLOW[toIdx].entry) return true;
  return onlyOptionalBetween(fromIdx, toIdx);
}

/**
 * Можно ли поставить target из current указанной ролью.
 *
 * Правила:
 *   • вперёд — на шаг, между которым и текущим лежат только НЕОБЯЗАТЕЛЬНЫЕ
 *     шаги. Перескок через опорный шаг запрещён: «выдал» нельзя поставить
 *     грузу, который ещё не забирали, иначе цепочка перестаёт что-либо значить;
 *   • повтор того же статуса — успех без изменений: водитель сканирует одну
 *     наклейку дважды, и это не ошибка, ругаться на него незачем;
 *   • назад — по тому же правилу и только ролям из CARGO_REVERT_ROLES;
 *   • сам шаг должен быть разрешён роли (CARGO_FLOW[].roles).
 *
 * Проверка обязана вызываться НА СЕРВЕРЕ: скрытая кнопка ограничением не
 * является, эндпоинт открыт для любого запроса.
 *
 * @returns {{ok: boolean, noop?: boolean, reason?: string}}
 */
export function canSetCargoStatus(current, target, role) {
  const cur = normalizeCargoStatus(current);

  if (!isKnownCargoStatus(target) || target === '') {
    return { ok: false, reason: 'Неизвестный статус груза' };
  }
  if (!roleMovesCargo(role)) {
    return { ok: false, reason: 'Эта роль не отмечает движение груза' };
  }
  if (target === cur) {
    return { ok: true, noop: true, reason: 'Статус уже стоит' };
  }
  if (!canRoleSetStep(role, target)) {
    return { ok: false, reason: `Роль не отмечает шаг «${cargoLabel(target)}»` };
  }

  const from = cur === '' ? -1 : flowIndex(cur);
  const to = flowIndex(target);

  if (canReachForward(from, to)) {
    return { ok: true };
  }
  if (to < from && onlyOptionalBetween(to, from)) {
    if (!CARGO_REVERT_ROLES.includes(role)) {
      return { ok: false, reason: 'Отменить шаг может только менеджер или администратор' };
    }
    return { ok: true };
  }
  return {
    ok: false,
    reason: `Нельзя перескочить шаг: сейчас «${cargoLabel(cur)}», следующий — «${cargoLabel(nextCargoStatus(cur))}»`,
  };
}

// ============================================================
// ИСТОРИЯ ДВИЖЕНИЯ (Request.cargoEvents).
//
// ЗАЧЕМ ОТДЕЛЬНО ОТ cargoStatus. В накладной хранится ТЕКУЩИЙ статус и ОДНА
// отметка времени — кто её поставил, не записывалось вовсе. По ТЗ кладовщик
// «фиксирует приёмку и отпуск», а операционный менеджер контролирует этапы:
// и то и другое требует ответа на вопрос «кто и когда», а не «где груз
// сейчас». Поэтому рядом появился журнал.
//
// cargoStatus НЕ заменяется журналом: на текущем поле стоят фильтры и показ
// в списках, перечитывать ради них массив событий незачем.
// ============================================================

/** Разбор журнала из базы: колонка Json, у старых записей — null. */
export function cargoEventsFrom(raw) {
  if (Array.isArray(raw)) return raw.filter((e) => e && typeof e === 'object');
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e === 'object') : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Запись журнала.
 *
 * back — отметка отката. Откат не стираем из истории: «этот груз отметили
 * выданным и через минуту откатили» — как раз то, ради чего журнал заводился.
 */
export function buildCargoEvent(status, actor = {}, opts = {}) {
  return {
    status,
    at: opts.at || new Date().toISOString(),
    byId: actor.id ?? null,
    byName: actor.name || '',
    byRole: actor.role || '',
    back: !!opts.back,
  };
}

/** Добавить запись, не потеряв прежние. */
export function appendCargoEvent(raw, event) {
  return [...cargoEventsFrom(raw), event];
}

/** Последняя запись по конкретному шагу — «когда груз приняли на склад». */
export function lastCargoEventFor(raw, status) {
  const list = cargoEventsFrom(raw).filter((e) => e.status === status && !e.back);
  return list.length ? list[list.length - 1] : null;
}

/** Шаги, которые груз реально проходил (по журналу, без откатов). */
export function reachedCargoSteps(raw) {
  const seen = new Set();
  cargoEventsFrom(raw).forEach((e) => { if (!e.back && isKnownCargoStatus(e.status)) seen.add(e.status); });
  return CARGO_FLOW_KEYS.filter((k) => seen.has(k));
}

/**
 * Что закодировано в отсканированном QR.
 *
 * Новый формат — ссылка <origin>/scan/<id>: её открывает любая камера телефона.
 * Старый — строка TASU-<номер>-<город>-<получатель>, она уже напечатана на
 * наклейках отгруженного груза. Поддерживаем оба, иначе всё, что сейчас едет,
 * перестанет сканироваться.
 *
 * Разбор старого формата — по ПЕРВОМУ дефису после TASU-: в городе и ФИО дефис
 * бывает («Усть-Каменогорск»), а в номере — никогда.
 *
 * @returns {{kind: 'id'|'docNumber', value: string} | null}
 */
export function parseScanPayload(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  const scanMatch = raw.match(/\/scan\/([^/?#\s]+)/i);
  if (scanMatch) return { kind: 'id', value: decodeURIComponent(scanMatch[1]) };

  if (/^TASU-/i.test(raw)) {
    const rest = raw.slice(5);
    const docNumber = rest.split('-')[0].trim();
    return docNumber ? { kind: 'docNumber', value: docNumber } : null;
  }

  // Голый uuid — на случай, если QR перекодируют вручную.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return { kind: 'id', value: raw };
  }
  return null;
}

/** Содержимое QR для наклейки. */
export function buildScanUrl(origin, id) {
  const base = String(origin || '').replace(/\/+$/, '');
  return `${base}/scan/${id}`;
}
