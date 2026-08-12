// ============================================================
// Правило завершения частной накладной.
//
// ТЗ (заказчик): цепочка строгая —
//   Активные → (менеджер обработал) Обработанные → (бухгалтер завершил) Завершённые.
// Бухгалтер ВИДИТ накладную и в активных, но завершить может только ту,
// что менеджер уже перевёл в «Обработанные».
//
// ПОЧЕМУ ОТДЕЛЬНЫМ МОДУЛЕМ. Раньше правило существовало только как видимость
// кнопки: массовая кнопка рисовалась на вкладке «Обработанные», построчная —
// при status==='done'. Через интерфейс мимо не пройти, но самого правила не
// было: ни bulkPaid, ни серверный markPaid статус не проверяли. Устаревшая
// вкладка, две открытые копии страницы или прямой запрос — и завершается
// накладная, которую менеджер ещё не обработал.
//
// Теперь правило записано один раз, и его применяют обе стороны.
// Серверная копия — в request.controller.ts, помечена ⚠️ ЗЕРКАЛО.
// ============================================================

/** Статус «Обработанные» — единственное состояние, из которого можно завершать. */
export const PROCESSED_STATUS = 'done';
export const CANCELED_STATUS = 'canceled';

const statusOf = (act) => String((act && act.status) || '').trim();

/** Человеческое название статуса — для внятного отказа, а не «нельзя». */
export function statusLabel(status) {
  switch (String(status || '')) {
    case 'act': return 'В стоке';
    case 'sent': return 'Подано';
    case 'done': return 'Обработанные';
    case 'deferred': return 'Отложенные';
    case 'canceled': return 'Аннулированные';
    default: return status ? String(status) : 'без статуса';
  }
}

/**
 * Можно ли ЗАВЕРШИТЬ накладную (отметить оплату).
 * @returns {{ ok: boolean, reason: string }}
 */
export function canComplete(act) {
  const status = statusOf(act);
  if (!act) return { ok: false, reason: 'Накладная не найдена' };
  if (status === CANCELED_STATUS) {
    return { ok: false, reason: 'накладная аннулирована' };
  }
  if (act.isPaid) {
    return { ok: false, reason: 'уже завершена' };
  }
  if (status !== PROCESSED_STATUS) {
    return {
      ok: false,
      reason: `сейчас «${statusLabel(status)}» — сначала менеджер переводит в «Обработанные»`,
    };
  }
  return { ok: true, reason: '' };
}

/**
 * Снятие отметки об оплате (возврат в «Обработанные») правилом НЕ ограничено:
 * это исправление ошибки бухгалтера, и запирать его нельзя — иначе неверно
 * завершённую накладную нечем будет вернуть.
 */
export function canUncomplete(act) {
  if (!act) return { ok: false, reason: 'Накладная не найдена' };
  if (!act.isPaid) return { ok: false, reason: 'не была завершена' };
  return { ok: true, reason: '' };
}

/**
 * Делит выбранные накладные на те, что можно завершить, и остальные —
 * с причиной по каждой. Частичный отказ показываем поимённо: «переведено 3 из 5»
 * без списка оставляет менеджера гадать, что не прошло.
 */
export function splitCompletable(acts) {
  const allowed = [];
  const blocked = [];
  for (const a of acts || []) {
    const v = canComplete(a);
    if (v.ok) allowed.push(a);
    else blocked.push({ act: a, reason: v.reason });
  }
  return { allowed, blocked };
}
