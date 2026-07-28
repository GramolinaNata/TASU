// ============================================================
// Выплаты по партии из снапшота ведомости перевозчика.
//
// Вынесено ОДИН В ОДИН из BookkeeperReportPage (batchVedomostRow / batchPayouts),
// логика не менялась — вынос сделан ради тестов. На этих суммах завязаны реальные
// выплаты перевозчику, грузчикам и представителю, поэтому любое изменение
// отображения ведомости (например, убранная плашка «Сумма представителю»)
// не должно двигать здесь ни тенге.
//
// Ключевое: сумма представителя берётся из СТРОКИ снапшота (row.representativeSum).
// У старых ведомостей этого поля в строке нет — тогда и только тогда работает
// fallback «вес × ставка из снапшота». Явный 0 — это 0, а не повод для fallback.
// ============================================================

// data ведомости приходит и строкой JSON, и уже объектом — нормализуем.
export function parseSnapshot(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw) || {}; } catch { return {}; }
}

// Строка снапшота ведомости, относящаяся именно к этой партии.
// В одну ведомость входит несколько партий, поэтому берём разбивку по партии,
// а не общий итог ведомости.
export function vedomostRowForBatch(batch, vedomosts) {
  if (!batch || !batch.carrierVedomostId) return null;
  const vedomost = (vedomosts || []).find(v => v && v.id === batch.carrierVedomostId);
  if (!vedomost) return null;
  const snapshot = parseSnapshot(vedomost.data);
  const rows = Array.isArray(snapshot.rows) ? snapshot.rows : [];
  const row = rows.find(r => r && r.batchId === batch.id) || null;
  return row ? { ...row, _snapshot: snapshot } : null;
}

export function payoutsFromRow(row) {
  if (!row) return { carrierSum: 0, loaderSum: 0, representativeSum: 0 };

  // Новые ведомости: сумма представителя сохранена в строке (ставка из тарифов).
  // Старые: fallback на ручную ставку из snapshot × вес.
  const representativeSum = row.representativeSum != null
    ? Number(row.representativeSum) || 0
    : Math.round((Number(row.weight) || 0) * (Number((row._snapshot || {}).representativeRate) || 0));

  return {
    carrierSum: Number(row.carrierSum) || 0,
    loaderSum: Number(row.loaderSum) || 0,
    representativeSum,
  };
}

// Партия без ведомости (или ведомость не найдена) → нули, не «нет данных».
export function batchPayouts(batch, vedomosts) {
  return payoutsFromRow(vedomostRowForBatch(batch, vedomosts));
}
