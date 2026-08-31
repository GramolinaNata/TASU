// Цепочка подписей — серверное зеркало.
//
// ⚠️ ЗЕРКАЛО ФРОНТА: src/shared/sign/signChain.js. Общий модуль сделать
// нельзя — образ бэка собирается из server/ и до src/ не достаёт.
// ПРИ ПРАВКЕ МЕНЯТЬ В ДВУХ МЕСТАХ.

export const SIGN_ROLE = {
  CLIENT_REQUEST: 'client_request',
  CLIENT_DOCUMENT: 'client_document',
  DRIVER: 'driver',
  // СУЩЕСТВУЕТ В ПРОДЕ: им подписаны выданные грузы, на него смотрит тег
  // {%signature_receiver} в бланке СМР и СТАРЫЕ одноразовые ссылки, у которых
  // роль подписи в токене не записана вовсе. Строку менять нельзя.
  RECEIVER: 'receiver',
} as const;

export const SIGN_CHAIN: string[] = [
  SIGN_ROLE.CLIENT_REQUEST,
  SIGN_ROLE.CLIENT_DOCUMENT,
  SIGN_ROLE.DRIVER,
  SIGN_ROLE.RECEIVER,
];

const SIGN_HEADING: Record<string, string> = {
  [SIGN_ROLE.CLIENT_REQUEST]: 'Подпись заявки',
  [SIGN_ROLE.CLIENT_DOCUMENT]: 'Подпись документа',
  [SIGN_ROLE.DRIVER]: 'Приём груза к перевозке',
  [SIGN_ROLE.RECEIVER]: 'Подпись получателя',
};

const SIGN_HINT: Record<string, string> = {
  [SIGN_ROLE.CLIENT_REQUEST]: 'Подписывая, вы подтверждаете состав и условия перевозки.',
  [SIGN_ROLE.CLIENT_DOCUMENT]: 'Подписывая, вы подтверждаете перевозочный документ.',
  [SIGN_ROLE.DRIVER]: 'Подписывая, вы подтверждаете, что приняли груз к перевозке.',
  [SIGN_ROLE.RECEIVER]: 'Подписывая, вы подтверждаете получение груза.',
};

/**
 * ВОРОТА: документ нельзя сформировать без подписи заявки клиентом.
 *
 * СЕЙЧАС ВЫКЛЮЧЕНЫ — осознанно. На проде ни у одной существующей заявки
 * подписи заявки нет: механизма не существовало. С включёнными воротами
 * заказчик в день выката не сформировал бы ни одной ТТН/СМР — ни по новым
 * заявкам, ни по уже лежащим в работе. Подписи включаем сейчас,
 * обязательность — позже, когда старые заявки закроются.
 *
 * ВКЛЮЧИТЬ ОБРАТНО: поставить true ЗДЕСЬ И В ЗЕРКАЛЕ
 * src/shared/sign/signChain.js. Логика ворот на месте и покрыта тестами
 * в обоих положениях флага.
 */
export const REQUIRE_CLIENT_REQUEST_SIGNATURE = false;

export function isKnownSignRole(role: any): boolean {
  return SIGN_CHAIN.indexOf(String(role || '')) !== -1;
}

export function signHeading(role: string): string {
  return SIGN_HEADING[role] || 'Подпись';
}

export function signHint(role: string): string {
  return SIGN_HINT[role] || '';
}

export function signaturesFrom(raw: any): any[] {
  if (Array.isArray(raw)) return raw.filter((s) => s && typeof s === 'object');
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.filter((s: any) => s && typeof s === 'object') : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function hasSignature(raw: any, role: string): boolean {
  return signaturesFrom(raw).some((s) => s.role === role);
}

/** Заменить подпись роли, не тронув остальные. */
export function putSignature(raw: any, entry: any): any[] {
  const rest = signaturesFrom(raw).filter((s) => s.role !== entry.role);
  return [...rest, entry];
}

export function hasDocument(act: any): boolean {
  const t = String(act?.docType || act?.type || '').toLowerCase();
  return t === 'ttn' || t === 'smr';
}

export function canFormDocument(act: any): { ok: boolean; reason?: string } {
  if (!REQUIRE_CLIENT_REQUEST_SIGNATURE) return { ok: true };
  if (hasSignature(act?.signatures, SIGN_ROLE.CLIENT_REQUEST)) return { ok: true };
  return {
    ok: false,
    reason: 'Клиент ещё не подписал заявку. Выдайте ссылку на подпись заявки — без неё перевозочный документ не формируется.',
  };
}

/**
 * Можно ли СЕЙЧАС собирать эту подпись.
 *
 * Подпись ПОЛУЧАТЕЛЯ намеренно без ворот: она существовала до этой цепочки и
 * ставится в момент выдачи. Запретить её из-за незаполненной цепочки значило
 * бы сломать выдачу уже едущего груза.
 */
export function canSign(act: any, role: string): { ok: boolean; reason?: string } {
  if (!isKnownSignRole(role)) return { ok: false, reason: 'Неизвестная роль подписи' };
  if (role === SIGN_ROLE.CLIENT_REQUEST) return { ok: true };
  if (role === SIGN_ROLE.RECEIVER) return { ok: true };

  if (role === SIGN_ROLE.CLIENT_DOCUMENT) {
    if (!hasDocument(act)) {
      return { ok: false, reason: 'Документ (СМР/ТТН) ещё не сформирован — подписывать нечего.' };
    }
    if (REQUIRE_CLIENT_REQUEST_SIGNATURE && !hasSignature(act?.signatures, SIGN_ROLE.CLIENT_REQUEST)) {
      return { ok: false, reason: 'Сначала клиент подписывает заявку.' };
    }
    return { ok: true };
  }

  if (!hasDocument(act)) return { ok: false, reason: 'Документ (СМР/ТТН) ещё не сформирован.' };
  if (!hasSignature(act?.signatures, SIGN_ROLE.CLIENT_DOCUMENT)) {
    return { ok: false, reason: 'Клиент ещё не подписал документ.' };
  }
  return { ok: true };
}
