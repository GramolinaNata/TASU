// Цепочка подписей.
//
// ТЗ: менеджер оформляет заявку → КЛИЕНТ ПОДПИСЫВАЕТ ЗАЯВКУ → система
// формирует документ (СМР/ТТН) → КЛИЕНТ ПОДПИСЫВАЕТ ДОКУМЕНТ → ВОДИТЕЛЬ
// ПОДПИСЫВАЕТ приём груза к перевозке. Подпись получателя при выдаче в
// проекте уже была и остаётся четвёртой ступенью.
//
// ГДЕ ЖИВЁТ. Request.signatures — массив [{role, name, image, signedAt, token}].
// Структура изначально рассчитана на несколько подписей, но сервер писал в неё
// ровно одну роль ('receiver') и фильтровал по ней же. Здесь описаны РОЛИ и
// ПОРЯДОК, а хардкод снят в public.route.ts.
//
// ⚠️ ЗЕРКАЛО СЕРВЕРА: server/src/lib/signChain.ts. Общий модуль сделать
// нельзя — образ бэка собирается из server/ и до src/ не достаёт (та же
// причина, что у cargoStatus, courierCity, accessLink и roles).
// ПРИ ПРАВКЕ МЕНЯТЬ В ДВУХ МЕСТАХ.

/**
 * Роли подписей.
 *
 * 'receiver' СУЩЕСТВУЕТ В ПРОДЕ: им подписаны выданные грузы, на него смотрит
 * тег {%signature_receiver} в бланке СМР и старые одноразовые ссылки, у
 * которых роль подписи в токене не записана вовсе. Строку менять нельзя.
 */
export const SIGN_ROLE = {
  CLIENT_REQUEST: 'client_request',
  CLIENT_DOCUMENT: 'client_document',
  DRIVER: 'driver',
  RECEIVER: 'receiver',
};

/** Порядок ступеней. Получатель — последний: он расписывается при выдаче. */
export const SIGN_CHAIN = [
  SIGN_ROLE.CLIENT_REQUEST,
  SIGN_ROLE.CLIENT_DOCUMENT,
  SIGN_ROLE.DRIVER,
  SIGN_ROLE.RECEIVER,
];

export const SIGN_META = {
  [SIGN_ROLE.CLIENT_REQUEST]: {
    label: 'Клиент — заявка',
    who: 'Клиент',
    what: 'заявку',
    // Что показать человеку на странице подписи.
    heading: 'Подпись заявки',
    hint: 'Подписывая, вы подтверждаете состав и условия перевозки.',
  },
  [SIGN_ROLE.CLIENT_DOCUMENT]: {
    label: 'Клиент — документ (СМР/ТТН)',
    who: 'Клиент',
    what: 'перевозочный документ',
    heading: 'Подпись документа',
    hint: 'Подписывая, вы подтверждаете перевозочный документ.',
  },
  [SIGN_ROLE.DRIVER]: {
    label: 'Водитель — приём к перевозке',
    who: 'Водитель',
    what: 'приём груза к перевозке',
    heading: 'Приём груза к перевозке',
    hint: 'Подписывая, вы подтверждаете, что приняли груз к перевозке.',
  },
  [SIGN_ROLE.RECEIVER]: {
    label: 'Получатель — выдача груза',
    who: 'Получатель',
    what: 'получение груза',
    heading: 'Подпись получателя',
    hint: 'Подписывая, вы подтверждаете получение груза.',
  },
};

/**
 * ВОРОТА: документ нельзя сформировать без подписи заявки клиентом.
 *
 * СЕЙЧАС ВЫКЛЮЧЕНЫ — и это осознанное решение, а не недоделка.
 *
 * На проде НИ У ОДНОЙ существующей заявки подписи заявки нет: механизма не
 * существовало. С включёнными воротами заказчик в день выката не смог бы
 * сформировать ни одной ТТН/СМР — ни по новым заявкам, ни по десяткам уже
 * лежащих в работе. Это остановило бы отгрузку, а не улучшило процесс.
 *
 * Поэтому подписи включаются сейчас (собирать их можно, цепочка работает,
 * порядок ступеней соблюдается), а обязательность подписи заявки для
 * формирования документа — позже, когда заказчик перейдёт на процесс и
 * старые заявки закроются.
 *
 * ВКЛЮЧИТЬ ОБРАТНО: поставить true ЗДЕСЬ И В ЗЕРКАЛЕ
 * server/src/lib/signChain.ts. Больше ничего менять не нужно — вся логика
 * ворот на месте и покрыта тестами в обоих положениях флага.
 */
export const REQUIRE_CLIENT_REQUEST_SIGNATURE = false;

export function isKnownSignRole(role) {
  return Object.prototype.hasOwnProperty.call(SIGN_META, String(role || ''));
}

export function signLabel(role) {
  return SIGN_META[role]?.label || String(role || '');
}

/** Разбор колонки: Json-массив, у старых записей null. */
export function signaturesFrom(raw) {
  if (Array.isArray(raw)) return raw.filter((s) => s && typeof s === 'object');
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.filter((s) => s && typeof s === 'object') : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Подпись конкретной роли (последняя, если расписывались дважды). */
export function signatureOf(raw, role) {
  const list = signaturesFrom(raw).filter((s) => s.role === role);
  return list.length ? list[list.length - 1] : null;
}

export function hasSignature(raw, role) {
  return !!signatureOf(raw, role);
}

/**
 * Заменить подпись роли, не тронув остальные.
 *
 * Именно ЗАМЕНИТЬ: если человек расписался повторно (промахнулся, переподписал
 * по новой ссылке), в документе должна быть одна подпись роли, а не две.
 */
export function putSignature(raw, entry) {
  const rest = signaturesFrom(raw).filter((s) => s.role !== entry.role);
  return [...rest, entry];
}

/** Сформирован ли перевозочный документ. */
export function hasDocument(act) {
  const t = String(act?.docType || act?.type || '').toLowerCase();
  return t === 'ttn' || t === 'smr';
}

/**
 * Можно ли формировать СМР/ТТН.
 *
 * @param {object} act
 * @param {{require?: boolean}} [opts] — переопределение флага ворот.
 *   Нужно, чтобы тесты проверяли ОБА положения, не завися от текущего
 *   значения константы: иначе каждое переключение флага ломало бы набор.
 * @returns {{ok: boolean, reason?: string}}
 */
export function canFormDocument(act, opts = {}) {
  const require = opts.require ?? REQUIRE_CLIENT_REQUEST_SIGNATURE;
  if (!require) return { ok: true };
  if (hasSignature(act?.signatures, SIGN_ROLE.CLIENT_REQUEST)) return { ok: true };
  return {
    ok: false,
    reason: 'Клиент ещё не подписал заявку. Выдайте ссылку на подпись заявки — без неё перевозочный документ не формируется.',
  };
}

/**
 * Можно ли СЕЙЧАС собирать эту подпись.
 *
 * Порядок — не формальность: подпись документа, которого нет, подтверждает
 * пустоту, а приём груза водителем до подписи документа клиентом лишает
 * подпись водителя предмета.
 *
 * Подпись ПОЛУЧАТЕЛЯ намеренно без ворот: она existовала до этой цепочки и
 * ставится в момент выдачи. Запретить её из-за незаполненной цепочки значило
 * бы сломать выдачу уже едущего груза.
 *
 * @returns {{ok: boolean, reason?: string}}
 */
export function canSign(act, role, opts = {}) {
  const require = opts.require ?? REQUIRE_CLIENT_REQUEST_SIGNATURE;
  if (!isKnownSignRole(role)) return { ok: false, reason: 'Неизвестная роль подписи' };

  if (role === SIGN_ROLE.CLIENT_REQUEST) return { ok: true };
  if (role === SIGN_ROLE.RECEIVER) return { ok: true };

  if (role === SIGN_ROLE.CLIENT_DOCUMENT) {
    if (!hasDocument(act)) {
      return { ok: false, reason: 'Документ (СМР/ТТН) ещё не сформирован — подписывать нечего.' };
    }
    if (require && !hasSignature(act?.signatures, SIGN_ROLE.CLIENT_REQUEST)) {
      return { ok: false, reason: 'Сначала клиент подписывает заявку.' };
    }
    return { ok: true };
  }

  // driver
  if (!hasDocument(act)) {
    return { ok: false, reason: 'Документ (СМР/ТТН) ещё не сформирован.' };
  }
  if (!hasSignature(act?.signatures, SIGN_ROLE.CLIENT_DOCUMENT)) {
    return { ok: false, reason: 'Клиент ещё не подписал документ.' };
  }
  return { ok: true };
}

/**
 * Состояние цепочки для показа в карточке накладной.
 * @returns [{role, label, signed, at, name, available, reason}]
 */
export function signChainState(act, opts = {}) {
  return SIGN_CHAIN.map((role) => {
    const sig = signatureOf(act?.signatures, role);
    const gate = canSign(act, role, opts);
    return {
      role,
      label: signLabel(role),
      signed: !!sig,
      at: sig?.signedAt || null,
      name: sig?.name || '',
      available: gate.ok,
      reason: gate.reason || '',
    };
  });
}

/** Ближайшая неподписанная ступень, которую уже можно собрать. */
export function nextSignRole(act, opts = {}) {
  const state = signChainState(act, opts);
  const next = state.find((s) => !s.signed && s.available);
  return next ? next.role : null;
}
