// ============================================================
// Расчёт выплаты ПЕРЕВОЗЧИКУ и ПРЕДСТАВИТЕЛЮ по тарифу.
//
// Отдельная функция рядом с движком: движок частных/юрлиц (calcTariff.js)
// принят заказчиком и НЕ трогается. Логику выбора диапазона повторяем здесь
// (а не импортируем из движка), чтобы правки этого расчёта физически не могли
// задеть расчёт для клиентов.
//
// Формат тарифа:
//   • НОВЫЙ  — weightRanges._ranges: [{ maxWeight, mode, value, delivery, deliveryMode }]
//              mode fixed  → value как сумма целиком
//              mode perKg  → value × вес
//              delivery — доплата этого диапазона (fixed или ×вес по deliveryMode);
//              учитывается, чтобы введённое в редакторе не пропадало молча
//              maxWeight пустой/null — открытый верхний диапазон («свыше»)
//   • СТАРЫЙ — плоская ставка tariff.pricePerKg: сумма = ставка × вес
//
// Обратная совместимость: если _ranges нет или он пуст — считаем ровно так,
// как считалось раньше (pricePerKg × вес), до копейки.
// ============================================================

function toNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// Выбор диапазона по весу: первый, чей верхний предел не меньше веса;
// если вес больше всех — последний («свыше»).
function pickRange(ranges, weightKg) {
  const norm = ranges
    .map((r) => {
      const raw = r ? r.maxWeight : undefined;
      return {
        maxW: raw === null || raw === undefined || raw === "" ? Infinity : toNum(raw),
        mode: r && r.mode === "perKg" ? "perKg" : "fixed",
        value: toNum(r && r.value),
        delivery: toNum(r && r.delivery),
        deliveryMode: r && r.deliveryMode === "perKg" ? "perKg" : "fixed",
      };
    })
    .sort((a, b) => a.maxW - b.maxW);

  if (norm.length === 0) return null;
  return norm.find((r) => weightKg <= r.maxW) || norm[norm.length - 1];
}

/**
 * @param {object} tariff   — тариф категории 'carriers' | 'representatives'
 * @param {number} weightKg — вес партии, кг
 * @returns {{ sum:number, rate:number, label:string, byRanges:boolean, found:boolean }}
 *   sum      — сумма к выплате, тг (округление до целого)
 *   rate     — эффективная ставка тг/кг (sum / вес). Нужна для снапшота ведомости:
 *              на неё опираются старые места, пересчитывающие сумму как вес × ставка.
 *   label    — понятная подпись для колонки «Тариф»
 *   byRanges — расчёт шёл по диапазонам (иначе по плоской ставке)
 */
export function calcCarrierPrice(tariff, weightKg) {
  const w = toNum(weightKg);
  if (!tariff) return { sum: 0, rate: 0, label: "тариф не найден", byRanges: false, found: false };

  const wr = (tariff.weightRanges && typeof tariff.weightRanges === "object") ? tariff.weightRanges : {};
  const ranges = Array.isArray(wr._ranges) ? wr._ranges : [];

  // ── Новый формат: диапазоны по весу ──
  if (ranges.length > 0) {
    const r = pickRange(ranges, w);
    if (r) {
      const base = r.mode === "perKg" ? r.value * w : r.value;
      const extra = r.deliveryMode === "perKg" ? r.delivery * w : r.delivery;
      const sum = Math.round(base + extra);
      const bound = r.maxW === Infinity ? "свыше" : `до ${r.maxW} кг`;
      const label = r.mode === "perKg"
        ? `${bound} · ${r.value.toLocaleString()} тг/кг`
        : `${bound} · ${r.value.toLocaleString()} тг`;
      return {
        sum,
        rate: w > 0 ? sum / w : 0,
        label: extra > 0 ? `${label} + ${extra.toLocaleString()} тг` : label,
        byRanges: true,
        found: true,
      };
    }
  }

  // ── Старый формат: плоская ставка за кг (поведение не меняется) ──
  const rate = toNum(tariff.pricePerKg);
  return {
    sum: Math.round(rate * w),
    rate,
    label: rate > 0 ? `${rate.toLocaleString()} тг/кг` : "—",
    byRanges: false,
    found: rate > 0,
  };
}

// Есть ли у тарифа диапазоны (для подсказок в интерфейсе).
export function hasRanges(tariff) {
  const wr = (tariff && tariff.weightRanges && typeof tariff.weightRanges === "object") ? tariff.weightRanges : {};
  return Array.isArray(wr._ranges) && wr._ranges.length > 0;
}
