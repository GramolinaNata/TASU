// src/shared/batch/batchTotals.js
// ============================================================
// Чистые хелперы агрегации накладных партии. Вынесены из компонентов
// (BookkeeperReportPage, BatchesPage, BatchDetailPage, CarrierVedomostCreatePage),
// чтобы:
//   • логика «исключить аннулированные» жила в одном месте;
//   • её можно было покрыть автотестами (batchTotals.test.mjs).
// Аннулированные накладные (status === 'canceled') НЕ попадают в цифры
// (места, вес, выручка) — по требованию заказчика.
// ============================================================

export const CANCELED = "canceled";
export const isCanceled = (r) => !!r && r.status === CANCELED;

export function parseDetailsSafe(details) {
  if (!details) return {};
  if (typeof details === "object") return details;
  try { return JSON.parse(details); } catch { return {}; }
}

// Места/вес одной накладной из details.totals.
export function requestTotals(request) {
  const d = parseDetailsSafe(request && request.details);
  const t = (d && d.totals) || {};
  return { seats: Number(t.seats) || 0, weight: Number(t.weight) || 0 };
}

// Сумма (выручка) одной накладной: приоритет поля totalSum, затем details.totalSum.
export function requestIncome(request) {
  const d = parseDetailsSafe(request && request.details);
  return Number((request && request.totalSum) || d.totalSum || 0) || 0;
}

// requestIds партии БЕЗ аннулированных. getRequest(id) => накладная | undefined.
// Если накладная не найдена (не загрузилась) — id сохраняем (fallback, не теряем данные).
export function activeRequestIds(requestIds, getRequest) {
  return (requestIds || []).filter((rid) => {
    const r = getRequest(rid);
    return r ? r.status !== CANCELED : true;
  });
}

// Итоги партии (места, вес, выручка) по requestIds, исключая аннулированные.
export function batchTotalsExcludingCanceled(requestIds, getRequest) {
  let seats = 0, weight = 0, income = 0, count = 0;
  (requestIds || []).forEach((rid) => {
    const r = getRequest(rid);
    if (!r || isCanceled(r)) return; // аннулированные и ненайденные не считаем
    const t = requestTotals(r);
    seats += t.seats;
    weight += t.weight;
    income += requestIncome(r);
    count += 1;
  });
  return { seats, weight, income, count };
}

// Карта id -> { seats, weight } из списка накладных, БЕЗ аннулированных.
// Используется в списке партий (BatchesPage) для подсчёта колонок налету.
export function buildActiveTotalsMap(requests) {
  const map = {};
  (requests || []).forEach((r) => {
    if (isCanceled(r)) return;
    map[r.id] = requestTotals(r);
  });
  return map;
}
