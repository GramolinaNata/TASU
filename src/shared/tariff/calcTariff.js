// src/shared/tariff/calcTariff.js
// ============================================================
// Единый движок расчёта стоимости доставки (юр. лица + частные).
// Одна формула на весь проект — чтобы SimpleActPage, ActCreatePage
// и ведомости считали одинаково и не расходились.
//
// ИТОГО = max(платаЗаВес, платаЗаКуб) + доставка диапазона + регион + выгрузка + ПРР
// (округление итога — в большую сторону, Math.ceil).
//
// Плата за вес берётся по ДИАПАЗОНАМ. Новый формат — массив _ranges:
//   { maxWeight, mode: 'fixed'|'perKg', value, delivery }
//     • fixed — value как сумма целиком
//     • perKg — value × фактический вес
//     • delivery — фикс. доставка диапазона, прибавляется к базе при любом mode
//     • maxWeight = null/пусто → открытый верхний диапазон («свыше»)
// Старый формат (rN/dN, всегда фикс. сумма) поддерживается как fallback,
// чтобы существующие тарифы в базе считались без изменений.
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
    .replace(/__REPRESENTATIVES$/, "")
    .replace(/__CITYDELIVERY$/, "")
    .replace(/__REGIONDELIVERY$/, "")
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

// Тариф отдельной категории доставки (city_delivery | region_delivery)
// по названию города/посёлка. Категория берётся из weightRanges._category.
export function findDeliveryCategoryTariff(tariffs, cityRaw, category) {
  const clean = cleanCityName(cityRaw);
  if (!clean) return undefined;
  return (tariffs || []).find(
    (t) => getTariffCategory(t) === category && cleanCityName(t.city) === clean
  );
}

// Региональная доплата: ищем тариф (город), у которого в _regionalDeliveries
// есть посёлок с именем = город получателя. База берётся из тарифа-города,
// доплата — из диапазонов посёлка по весу. Поддерживаются форматы: новый
// { maxWeight, sum } и старый { maxWeight, extra/price }.
export function findRegionalTariff(tariffs, cityRaw, weightKg, category, transport) {
  const clean = cleanCityName(cityRaw);
  if (!clean) return null;
  // maxWeight пустой/null трактуем как открытый диапазон («свыше»).
  const normMax = (v) => (v === "" || v == null ? Infinity : (Number(v) || 0));
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
      ? [...match.ranges].sort((a, b) => normMax(a.maxWeight) - normMax(b.maxWeight))
      : [];
    let range = sorted.find((r) => weightKg <= normMax(r.maxWeight));
    if (!range && sorted.length > 0) range = sorted[sorted.length - 1];

    // Доплата за посёлок считается как диапазон основного тарифа: тип расчёта
    // значения (fixed/perKg) + доставка на диапазон (fixed/perKg). Совместимость:
    // старый формат без типа — value берётся из sum/extra/price, mode/deliveryMode = fixed.
    let regionalExtra = 0;
    if (range) {
      const value = toNum(range.value ?? range.sum ?? range.extra ?? range.price);
      const val = range.mode === "perKg" ? value * weightKg : value;
      const dRaw = toNum(range.delivery);
      const dVal = range.deliveryMode === "perKg" ? dRaw * weightKg : dRaw;
      regionalExtra = val + dVal;
    }

    return {
      tariff: t,
      parentCity: String(t.city || "").replace(/__\w+$/, ""),
      regionalExtra,
      regionLabel: match.region || cityRaw,
    };
  }
  return null;
}

// Плата за вес по ступеням.
// Приоритет — новый формат _ranges (массив диапазонов с типом расчёта):
//   { maxWeight, mode: 'fixed'|'perKg', value, delivery, deliveryMode }
//   • mode fixed — value берётся как сумма целиком; perKg — value × фактический вес
//   • delivery — доставка ЭТОГО диапазона, прибавляется к базе при любом mode
//   • deliveryMode fixed — delivery как сумма целиком; perKg — delivery × вес
//     (если deliveryMode нет — старое поведение 'fixed')
//   • maxWeight пустой/null = открытый верхний диапазон («свыше»)
// Если _ranges нет — работает старый формат rN/dN (все диапазоны = фикс. сумма),
// чтобы существующие тарифы в базе считались без изменений.
function weightPrice(wr, weightKg, isPrivate) {
  // --- Новый формат: _ranges с типом диапазона ---
  if (Array.isArray(wr._ranges) && wr._ranges.length > 0) {
    const ranges = wr._ranges
      .map((r) => {
        const raw = r ? r.maxWeight : undefined;
        const maxW = raw === null || raw === undefined || raw === "" ? Infinity : toNum(raw);
        return {
          maxW,
          mode: r && r.mode === "perKg" ? "perKg" : "fixed",
          value: toNum(r && r.value),
          delivery: toNum(r && r.delivery),
          deliveryMode: r && r.deliveryMode === "perKg" ? "perKg" : "fixed",
        };
      })
      .sort((a, b) => a.maxW - b.maxW);

    let range = ranges.find((r) => weightKg <= r.maxW);
    if (!range) range = ranges[ranges.length - 1];

    const sum = range.mode === "perKg" ? range.value * weightKg : range.value;
    const label =
      range.mode === "perKg"
        ? `${weightKg} кг × ${range.value.toLocaleString()} тг/кг`
        : range.maxW === Infinity
          ? "макс. диапазон"
          : `до ${range.maxW} кг`;
    return { sum, delivery: range.delivery, deliveryMode: range.deliveryMode, label };
  }

  // --- Старый формат: rN (цена) + dN (доставка), всегда фикс. сумма ---
  const steps = [];
  Object.keys(wr).forEach((k) => {
    const m = /^r(\d+)$/.exec(k);
    if (!m) return;
    const maxW = parseInt(m[1], 10);
    const price = toNum(wr[k]);
    const delivery = toNum(wr["d" + maxW]);
    if (maxW > 0 && (price > 0 || delivery > 0)) steps.push({ maxW, price, delivery });
  });
  steps.sort((a, b) => a.maxW - b.maxW);

  if (steps.length === 0) {
    return { sum: 0, delivery: 0, label: "нет диапазонов" };
  }

  for (const st of steps) {
    if (weightKg <= st.maxW) {
      return { sum: st.price, delivery: st.delivery, label: `до ${st.maxW} кг` };
    }
  }

  const last = steps[steps.length - 1];
  return { sum: last.price, delivery: last.delivery, label: `свыше ${last.maxW} кг (макс. диапазон)` };
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
export function calcDeliveryPrice({ tariffs, city, weightKg = 0, volumeM3 = 0, seats = 0, prrType = '', pallets = 0, storageMode = '', storageDays = 0, cityDelivery = false, regionDelivery = '', sizeCategory = '', category, transport }) {
  const cityClean = cleanCityName(city);
  if (!cityClean) return { ok: false, error: "Не указан город получателя" };

  let tariff = findDeliveryTariff(tariffs, city, category, transport);
  let regionalExtra = 0;
  let regionLabel = "";
  let regionParent = "";  // город-родитель, если база взята из посёлка внутри тарифа
  let hubPoselok = "";    // посёлок, база которого взята из опорного города (fallback)
  let hubCityName = "";   // название опорного города (для описания)

  // ПРИОРИТЕТ: город назначения — посёлок ВНУТРИ тарифа (_regionalDeliveries).
  // База берётся из тарифа-города, доплата — из диапазонов посёлка. Категория
  // (юр/частный) определяется автоматически тем, в тарифе какой категории найден посёлок.
  if (!tariff) {
    const regional = findRegionalTariff(tariffs, city, weightKg, category, transport);
    if (regional) {
      tariff = regional.tariff;
      regionalExtra = regional.regionalExtra;
      regionLabel = regional.regionLabel;
      regionParent = regional.parentCity;
    }
  }

  // FALLBACK (legacy): отдельный тариф region_delivery с опорным городом (_hubCity).
  if (!tariff) {
    const rd = findDeliveryCategoryTariff(tariffs, city, "region_delivery");
    const hub = rd && rd.weightRanges ? rd.weightRanges._hubCity : "";
    if (rd && hub) {
      const hubTariff = findDeliveryTariff(tariffs, hub, category, transport);
      if (hubTariff) {
        tariff = hubTariff;
        hubPoselok = city;
        hubCityName = hub;
      }
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
  const pricePerCubic = toNum(wr._pricePerCubic);
  const deliveryPrice = toNum(tariff.deliveryPrice);

  if (weightKg <= 0 && volumeM3 <= 0) {
    return { ok: false, error: "Укажите вес или объём груза" };
  }

  // 1) База: max(вес, куб). Плюс доставка ЭТОГО диапазона веса.
  const wp = weightPrice(wr, weightKg, isPrivate);
  let base = wp.sum;
  let baseLabel = wp.label;
  // Доставка диапазона: fixed — как есть, perKg — умножается на фактический вес.
  const rangeDelivery = wp.deliveryMode === "perKg" ? toNum(wp.delivery) * weightKg : toNum(wp.delivery);

  if (volumeM3 > 0 && pricePerCubic > 0) {
    const byCube = volumeM3 * pricePerCubic;
    if (byCube > base) {
      base = byCube;
      baseLabel = `${volumeM3} м³ × ${pricePerCubic.toLocaleString()} тг/м³`;
    }
  }

  let sum = base;
  const baseWhere = regionParent ? `${regionParent} → ${city}` : (hubPoselok ? `${hubCityName} → ${city}` : city);
  let description = `Доставка ${baseWhere} (${baseLabel})`;

  if (rangeDelivery > 0) {
    sum += rangeDelivery;
    description += wp.deliveryMode === "perKg"
      ? ` + доставка диапазона ${toNum(wp.delivery).toLocaleString()} тг/кг × ${weightKg} кг`
      : ` + доставка диапазона ${rangeDelivery.toLocaleString()} тг`;
  }

  // 2) Доплата за посёлок внутри тарифа (_regionalDeliveries) — приоритетный механизм.
  if (regionalExtra > 0) {
    sum += regionalExtra;
    description += ` + ${regionalExtra.toLocaleString()} тг регион «${regionLabel}»`;
  }

  // 2a) Доп. доставка по городу (отдельная категория city_delivery города назначения)
  if (cityDelivery) {
    const cd = findDeliveryCategoryTariff(tariffs, city, "city_delivery");
    if (cd) {
      const s = toNum(weightPrice(cd.weightRanges || {}, weightKg).sum);
      if (s > 0) {
        sum += s;
        description += ` + доставка по городу ${s.toLocaleString()} тг`;
      }
    }
  }

  // 2b) Доставка в регион/посёлок (region_delivery). Посёлок определяется явным
  //     флагом из заявки ЛИБО автоматически — если сам город назначения оказался
  //     посёлком, база которого взята из опорного города. Считается один раз.
  const regionPoselok = regionDelivery || hubPoselok;
  if (regionPoselok) {
    const rd = findDeliveryCategoryTariff(tariffs, regionPoselok, "region_delivery");
    if (rd) {
      const s = toNum(weightPrice(rd.weightRanges || {}, weightKg).sum);
      if (s > 0) {
        sum += s;
        description += ` + доставка в регион «${regionPoselok}» ${s.toLocaleString()} тг`;
      }
    }
  }

  // 2c) Категория габарита (частные лица): надбавка к тарифу.
  //     medium → _sizeMedium (по умолч. 1000), large → _sizeLarge (по умолч. 2000).
  if (sizeCategory === "medium" || sizeCategory === "large") {
    const extra = sizeCategory === "large" ? toNum(wr._sizeLarge) : toNum(wr._sizeMedium);
    if (extra > 0) {
      sum += extra;
      description += ` + габарит ${sizeCategory === "large" ? "большая" : "средняя"} ${extra.toLocaleString()} тг`;
    }
  }

  const unloadPerSeat = toNum(wr._unloadPerSeat);
  if (unloadPerSeat > 0 && seats > 0) {
    sum += unloadPerSeat * seats;
    description += ` + выгрузка ${seats} мест × ${unloadPerSeat.toLocaleString()} тг`;
  }

  // 5) ПРР: ручная = ставка × вес; палетная = ставка × кол-во палет.
  //    (_prrManual — тг/кг, _prrPallet — тг за палету)
  if (prrType === 'manual') {
    const rate = toNum(wr._prrManual);
    if (rate > 0 && weightKg > 0) {
      sum += rate * weightKg;
      description += ` + ПРР ручная ${rate.toLocaleString()} тг/кг × ${weightKg} кг`;
    }
  } else if (prrType === 'pallet') {
    const rate = toNum(wr._prrPallet);
    if (rate > 0 && pallets > 0) {
      sum += rate * pallets;
      description += ` + ПРР палетная ${rate.toLocaleString()} тг × ${pallets} пал.`;
    }
  }

  // 6) Хранение: по весу (вес × ставка × дни) или по кубам (объём × ставка × дни).
  //    Отдельная надбавка, не участвует в max(вес, куб) основной базы.
  if (storageDays > 0) {
    if (storageMode === 'weight') {
      const rate = toNum(wr._storagePerKg);
      if (rate > 0 && weightKg > 0) {
        sum += weightKg * rate * storageDays;
        description += ` + хранение ${weightKg} кг × ${rate.toLocaleString()} тг × ${storageDays} дн.`;
      }
    } else if (storageMode === 'cube') {
      const rate = toNum(wr._storagePerCubic);
      if (rate > 0 && volumeM3 > 0) {
        sum += volumeM3 * rate * storageDays;
        description += ` + хранение ${volumeM3} м³ × ${rate.toLocaleString()} тг × ${storageDays} дн.`;
      }
    }
  }

  sum = Math.ceil(sum); // округление в большую сторону (Правила ТЭУ)
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