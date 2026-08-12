// ============================================================
// Склейка накладной для списков: колонки таблицы + разобранный details.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. Списки делали это одной строкой:
//     return { ...a, ...details };
// то есть details ПЕРЕКРЫВАЛ колонки. Для большинства полей это правильно:
// маршрут, груз, контрагенты живут именно в details.
//
// Но часть признаков — собственность КОЛОНОК, и у них есть выделенные, закрытые
// ролью эндпоинты: завершение (mark-fully-completed, requireAccountant), оплата
// (mark-paid), возврат (restore). При этом updateRequest складывает любое
// неизвестное поле тела запроса внутрь details. Стоит одному вызову записать
// туда isFullyCompleted — и копия в details начинает перекрывать колонку.
//
// ЧЕМ ЭТО КОНЧАЛОСЬ. На проде у 5 накладных isFullyCompleted лежит и в
// details. Пока значения совпадают, никто ничего не замечает. Но restoreRequest
// гасит КОЛОНКУ и details.isFullyCompleted не трогает — после «вернуть в
// активные» копия в details продолжала бы говорить «завершена», и накладная
// осталась бы во вкладке «Завершённые» навсегда, мимо бухгалтера и вопреки ему.
//
// Поэтому: перечисленные ниже поля всегда берутся из колонки.
// ============================================================

/**
 * Поля, которыми владеет таблица, а не details.
 * Меняются только выделенными эндпоинтами, поэтому копия в details — всегда
 * мусор, а не источник правды.
 */
export const COLUMN_OWNED = [
  'isFullyCompleted',
  'fullyCompletedAt',
  'isPaid',
  'paidAt',
  'reEditedAfterCompletion',
  'status',
];

function parse(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw) || {}; } catch { return {}; }
}

/**
 * Склеивает запись из базы с её details.
 * details перекрывает колонки ВЕЗДЕ, кроме COLUMN_OWNED.
 *
 * @param {object} row  запись Request (details строкой или объектом)
 * @returns {object}
 */
export function mergeRequest(row) {
  if (!row || typeof row !== 'object') return {};
  const details = parse(row.details);
  const merged = { ...row, ...details };
  for (const key of COLUMN_OWNED) {
    // Колонки нет вовсе (частичная выборка) — не подставляем undefined
    // поверх осмысленного значения из details.
    if (Object.prototype.hasOwnProperty.call(row, key)) merged[key] = row[key];
  }
  return merged;
}
