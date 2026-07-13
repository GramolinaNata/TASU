// src/shared/tariff/calcTariff.js
// ============================================================
// Единый движок расчёта стоимости доставки (юр. лица + частные).
// Одна формула на весь проект — чтобы SimpleActPage, ActCreatePage
// и ведомости считали одинаково и не расходились.
//
// ИТОГО = max(платаЗаВес, платаЗаКуб) + регион + доставка(фикс)
//
// Пороги веса:
//   ЮР:      ≤10 → r10,  ≤20 → r20,           >20 → overKg × вес
//   ЧАСТНЫЙ: ≤10 → r10,  ≤20 → r20, ≤30 → r30, >30 → overKg × вес
// overKg («за кг сверх порога») задаётся в тарифе вручную (поле _pricePerKgOver20).
// ============================================================

function toNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

// Чистое имя города без служебных суффиксов и регистра.
export function cleanCityName(city) {
  return (city || "")
    .replace(/__PRIVATE$/, "")
    .replace(/__LOADERS$/, "")
    .replace(/__CARRIERS$/, "")
    .replace(/__AVIA$/, "")
    .trim()
    .toLowerCase();
}

// Категория тарифа: приоритет weightRanges._category, иначе по isPrivate.
export function getTariffCategory(t) {
  const wr = t && t.weightRanges && typeof t.weightRanges === "object" ? t.weightRanges : {};
  return wr._category || (t && t.isPrivate ? "private" : "legal");
}

// Тип перевозки тарифа: 'auto' | 'avia'. По умолчанию (у старых тарифов) — auto.
// Признаком служит суффикс города __AVIA либо weightRanges._transport.
export function getTariffTransport(t) {
  const wr = t && t.weightRanges && typeof t.weightRanges === "object" ? t.weightRanges : {};
  if (/__AVIA$/.test(t && t.city ? t.city : "")) return "avia";
  return wr._transport === "avia" ? "avia" : "auto";
}

// Прямой тариф доставки (legal/private) по городу.
// category:  'legal' | 'private' | undefined (любой из двух)
// transport: 'auto' | 'avia' | undefined (не ограничивать)
export function findDeliveryTariff(tariffs, cityRaw, category, transport) {
  const clean = cleanCityName(cityRaw);
  if (!clean) return undefined;
  return (tariffs || []).find((t) => {
    const cat = getTariffCategory(t);
    if (cat !== "legal" && cat !== "private") return false;
    if (category && cat !== category) return false;
    if (transport && getTariffTransport(t) !== transport) return false;
    return cleanCityName(t.city) === clean;
  });
}

// Региональная доплата: ищем тариф, у которого в _regionalDeliveries есть
// регион с именем = город получателя. Возвращаем опорный тариф + доплату.
export function findRegionalTariff(tariffs, cityRaw, weightKg, category, transport) {
  const clean = cleanCityName(cityRaw);
  if (!clean) return null;
  for (const t of tariffs || []) {
    const cat = getTariffCategory(t);
    if (cat !== "legal" && cat !== "private") continue;
    if (category && cat !== category) continue;
    if (transport && getTariffTransport(t) !== transport) continue;

    const wr = t.weightRanges || {};
    const regions = Array.isArray(wr._regionalDeliveries) ? wr._regionalDeliveries : [];
    const match = regions.find((r) => cleanCityName(r.region) === clean);
    if (!match) continue;

    const sorted = Array.isArray(match.ranges)
      ? [...match.ranges].sort((a, b) => (a.maxWeight || 0) - (b.maxWeight || 0))
      : [];
    let range = sorted.find((r) => weightKg <= (r.maxWeight || 0));
    if (!range && sorted.length > 0) range = sorted[sorted.length - 1];

    return {
      tariff: t,
      regionalExtra: range ? toNum(range.extra) : 0,
      regionLabel: match.region || cityRaw,
    };
  }
  return null;
}

// Плата за вес по ступеням.
function weightPrice(wr, weightKg, isPrivate) {
  const r10 = toNum(wr.r10);
  const r20 = toNum(wr.r20);
  const r30 = toNum(wr.r30);
  const overKg = toNum(wr._pricePerKgOver20);

  if (r10 > 0 && weightKg <= 10) return { sum: r10, label: "до 10 кг" };
  if (r20 > 0 && weightKg <= 20) return { sum: r20, label: "до 20 кг" };
  if (isPrivate && r30 > 0 && weightKg <= 30) return { sum: r30, label: "до 30 кг" };
  return {
    sum: weightKg * overKg,
    label: `${weightKg} кг × ${overKg.toLocaleString()} тг/кг`,
  };
}

/**
 * Главный расчёт.
 * @param {Object[]} tariffs   — массив тарифов из api.tariffs.list()
 * @param {string}   city      — город получателя
 * @param {number}   weightKg  — общий вес, кг
 * @param {number}   volumeM3  — общий объём, м³ (для max по кубу)
 * @param {string}   [category]— 'legal' | 'private' | undefined (не ограничивать)
 * @returns {{ ok:boolean, sum?:number, description?:string, tariff?:object, error?:string }}
 */
export function calcDeliveryPrice({ tariffs, city, weightKg = 0, volumeM3 = 0, category, transport }) {
  const cityClean = cleanCityName(city);
  if (!cityClean) return { ok: false, error: "Не указан город получателя" };

  let tariff = findDeliveryTariff(tariffs, city, category, transport);
  let regionalExtra = 0;
  let regionLabel = "";

  // Прямого нет — пробуем как подрегион (доставка до опорного города + доплата)
  if (!tariff) {
    const regional = findRegionalTariff(tariffs, city, weightKg, category, transport);
    if (regional) {
      tariff = regional.tariff;
      regionalExtra = regional.regionalExtra;
      regionLabel = regional.regionLabel;
    }
  }

  if (!tariff) {
    return {
      ok: false,
      error: `Тариф для направления «${city}» не найден. Добавьте его в Тарифы (или укажите этот город как регион в тарифе ближайшего города).`,
    };
  }

  const wr = tariff.weightRanges || {};
  const isPrivate = getTariffCategory(tariff) === "private";
  const overKg = toNum(wr._pricePerKgOver20);
  const pricePerCubic = toNum(wr._pricePerCubic);
  const deliveryPrice = toNum(tariff.deliveryPrice);

  if (weightKg <= 0 && volumeM3 <= 0) {
    return { ok: false, error: "Укажите вес или объём груза" };
  }

  const threshold = isPrivate ? 30 : 20;
  if (weightKg > threshold && overKg <= 0) {
    return {
      ok: false,
      error: `Для направления «${city}» не задан тариф «за кг (сверх ${threshold} кг)».`,
    };
  }

  // 1) База: max(вес, куб)
  const wp = weightPrice(wr, weightKg, isPrivate);
  let base = wp.sum;
  let baseLabel = wp.label;

  if (volumeM3 > 0 && pricePerCubic > 0) {
    const byCube = volumeM3 * pricePerCubic;
    if (byCube > base) {
      base = byCube;
      baseLabel = `${volumeM3} м³ × ${pricePerCubic.toLocaleString()} тг/м³`;
    }
  }

  let sum = base;
  let description = `Доставка ${city} (${baseLabel})`;

  // 2) Региональная доплата
  if (regionalExtra > 0) {
    sum += regionalExtra;
    description += ` + ${regionalExtra.toLocaleString()} тг регион «${regionLabel}»`;
  }

  // 3) Доставка — одна фикс. сумма, один раз
  if (deliveryPrice > 0) {
    sum += deliveryPrice;
    description += ` + доставка ${deliveryPrice.toLocaleString()} тг`;
  }

  sum = Math.round(sum);
  if (sum <= 0) {
    return { ok: false, error: "Не удалось рассчитать стоимость (проверьте суммы в тарифе)." };
  }

  return { ok: true, sum, description, tariff };
}

// ============================================================
// Ставка за кг для грузчиков / перевозчиков (для ведомости).
// Тариф ищется по городу и категории ('carriers' | 'loaders').
// Возвращает число (тг/кг) или 0, если тариф не найден.
// ============================================================
export function findRatePerKg(tariffs, cityRaw, category) {
  const clean = cleanCityName(cityRaw);
  if (!clean) return 0;
  const t = (tariffs || []).find((x) => {
    if (getTariffCategory(x) !== category) return false;
    return cleanCityName(x.city) === clean;
  });
  if (!t) return 0;
  const n = parseFloat(t.pricePerKg);
  return Number.isFinite(n) ? n : 0;
}