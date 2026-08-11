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

// Округление до копеек. Нужно построчной разбивке: слагаемые складываются
// в двоичной арифметике, и без этого «сумма строк = итог» держалось бы
// с точностью до 1e-12 — то есть не держалось бы.
function round2(v) {
  return Math.round((toNum(v) + Number.EPSILON) * 100) / 100;
}

// Город отправления по умолчанию: старые тарифы и заявки без явного отправления
// считаются как «Алматы» (обратная совместимость).
export const DEFAULT_FROM_CITY = "Алматы";

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

// Отображаемое имя города: убираем служебные суффиксы, регистр СОХРАНЯЕМ
// (в отличие от cleanCityName, который ещё и в нижний регистр приводит).
export function cityDisplayName(city) {
  return String(city || "")
    .replace(/__PRIVATE$/, "")
    .replace(/__LOADERS$/, "")
    .replace(/__CARRIERS$/, "")
    .replace(/__REPRESENTATIVES$/, "")
    .replace(/__CITYDELIVERY$/, "")
    .replace(/__REGIONDELIVERY$/, "")
    .replace(/__AVIA$/, "")
    .trim();
}

// Список направлений-назначений для подсказок в формах накладной/заявки.
// Возвращает [{ city, hint }]: города тарифов нужной категории + ПОСЁЛКИ из
// _regionalDeliveries (Жанаозен, Кулсары…). Посёлок приоритетнее одноимённого
// прямого тарифа (как и в расчёте) и помечается «посёлок · РодительскийГород».
// category: 'legal' | 'private' | undefined (обе категории доставки).
export function getDeliveryDestinations(tariffs, category) {
  const inCat = (t) => {
    const cat = getTariffCategory(t);
    if (cat !== "legal" && cat !== "private") return false;
    if (category && cat !== category) return false;
    return true;
  };
  const byClean = new Map(); // cleanCityName -> { city, hint }

  // 1) Посёлки из _regionalDeliveries — приоритетнее (расчёт так и считает).
  (tariffs || []).forEach((t) => {
    if (!inCat(t)) return;
    const wr = t.weightRanges && typeof t.weightRanges === "object" ? t.weightRanges : {};
    (Array.isArray(wr._regionalDeliveries) ? wr._regionalDeliveries : []).forEach((r) => {
      if (!r || !r.region) return;
      const clean = cleanCityName(r.region);
      if (!clean) return;
      byClean.set(clean, { city: cityDisplayName(r.region), hint: `посёлок · ${cityDisplayName(t.city)}` });
    });
  });

  // 2) Прямые города — если это имя ещё не занято посёлком.
  (tariffs || []).forEach((t) => {
    if (!inCat(t)) return;
    const clean = cleanCityName(t.city);
    if (!clean || byClean.has(clean)) return;
    byClean.set(clean, { city: cityDisplayName(t.city), hint: "" });
  });

  return [...byClean.values()].sort((a, b) => a.city.localeCompare(b.city, "ru"));
}

// Список городов ОТПРАВЛЕНИЯ (fromCity) из тарифов доставки — для подсказок.
/**
 * Города отправления.
 *
 * ТЗ: тарифы юрлиц и частных раздельные — город, заведённый в частных, не
 * должен показываться у юрлиц и наоборот. Поэтому здесь появился фильтр
 * category, как он давно есть у getDeliveryDestinations.
 *
 * Без category ведёт себя как раньше (обе категории) — на справочники
 * перевозчиков и представителей это не влияет: им нужны все города,
 * они привязывают исполнителей, а не считают тариф.
 *
 * @param {Array} tariffs
 * @param {string} [category] — 'legal' | 'private' | undefined (не ограничивать)
 */
export function getTariffOrigins(tariffs, category) {
  const set = new Set();
  (tariffs || []).forEach((t) => {
    const cat = getTariffCategory(t);
    if (cat !== "legal" && cat !== "private") return;
    if (category && cat !== category) return;
    const from = cityDisplayName(t.fromCity || DEFAULT_FROM_CITY) || DEFAULT_FROM_CITY;
    if (from) set.add(from);
  });
  if (set.size === 0) set.add(DEFAULT_FROM_CITY);
  return [...set].sort((a, b) => a.localeCompare(b, "ru"));
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

// Прямой тариф доставки (legal/private) по паре направлений.
// category:  'legal' | 'private' | undefined (любой из двух)
// transport: 'auto' | 'avia' | undefined (не ограничивать)
// fromCityRaw: город отправления; пусто → «Алматы» (старые тарифы/заявки).
export function findDeliveryTariff(tariffs, cityRaw, category, transport, fromCityRaw) {
  const clean = cleanCityName(cityRaw);
  if (!clean) return undefined;
  const cleanFrom = cleanCityName(fromCityRaw) || cleanCityName(DEFAULT_FROM_CITY);
  return (tariffs || []).find((t) => {
    const cat = getTariffCategory(t);
    if (cat !== "legal" && cat !== "private") return false;
    if (category && cat !== category) return false;
    if (transport && getTariffTransport(t) !== transport) return false;
    if (cleanCityName(t.city) !== clean) return false;
    // fromCity отсутствует у совсем старых записей → трактуем как «Алматы».
    const tFrom = cleanCityName(t.fromCity) || cleanCityName(DEFAULT_FROM_CITY);
    return tFrom === cleanFrom;
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
export function findRegionalTariff(tariffs, cityRaw, weightKg, category, transport, fromCityRaw) {
  const clean = cleanCityName(cityRaw);
  if (!clean) return null;
  const cleanFrom = cleanCityName(fromCityRaw) || cleanCityName(DEFAULT_FROM_CITY);
  // maxWeight пустой/null трактуем как открытый диапазон («свыше»).
  const normMax = (v) => (v === "" || v == null ? Infinity : (Number(v) || 0));
  for (const t of tariffs || []) {
    const cat = getTariffCategory(t);
    if (cat !== "legal" && cat !== "private") continue;
    if (category && cat !== category) continue;
    if (transport && getTariffTransport(t) !== transport) continue;
    const tFrom = cleanCityName(t.fromCity) || cleanCityName(DEFAULT_FROM_CITY);
    if (tFrom !== cleanFrom) continue;

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
          // ТЗ: забор груза — третий тариф рядом с доставкой, со своей
          // градацией по тем же диапазонам и своим типом расчёта.
          // У старых диапазонов поля нет — читается как ноль, суммы не меняются.
          pickup: toNum(r && r.pickup),
          pickupMode: r && r.pickupMode === "perKg" ? "perKg" : "fixed",
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
    return {
      sum,
      delivery: range.delivery, deliveryMode: range.deliveryMode,
      pickup: range.pickup, pickupMode: range.pickupMode,
      label,
    };
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
    return { sum: 0, delivery: 0, pickup: 0, label: "нет диапазонов" };
  }

  for (const st of steps) {
    if (weightKg <= st.maxW) {
      // Старый формат rN/dN забора не знает — pickup всегда 0.
      return { sum: st.price, delivery: st.delivery, pickup: 0, label: `до ${st.maxW} кг` };
    }
  }

  const last = steps[steps.length - 1];
  return { sum: last.price, delivery: last.delivery, pickup: 0, label: `свыше ${last.maxW} кг (макс. диапазон)` };
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
export function calcDeliveryPrice({ tariffs, city, fromCity = '', weightKg = 0, volumeM3 = 0, seats = 0, prrType = '', pallets = 0, storageMode = '', storageDays = 0, cityDelivery = false, regionDelivery = '', sizeCategory = '', category, transport,
  // ТЗ: доставка и забор груза включаются галочками при оформлении.
  // withDelivery по умолчанию TRUE — раньше доставка считалась безусловно,
  // и без этого дефолта все прежние заявки при пересчёте подешевели бы.
  // withPickup по умолчанию FALSE — забор берут не всегда.
  withDelivery = true, withPickup = false }) {
  const cityClean = cleanCityName(city);
  if (!cityClean) return { ok: false, error: "Не указан город получателя" };

  let tariff = null;
  let regionalExtra = 0;
  let regionLabel = "";
  let regionParent = "";  // город-родитель, если база взята из посёлка внутри тарифа
  let hubPoselok = "";    // посёлок, база которого взята из опорного города (fallback)
  let hubCityName = "";   // название опорного города (для описания)

  // ПРИОРИТЕТ (ТЗ): если город назначения заведён как посёлок ВНУТРИ какого-то
  // тарифа (_regionalDeliveries) — считаем «родительский город + доплата за посёлок».
  // Это ВАЖНЕЕ одноимённого отдельного тарифа: посёлок настроен явно как доплата к
  // городу, поэтому он перекрывает случайный/устаревший standalone-тариф того же имени.
  // База берётся из тарифа-города, доплата — из диапазонов посёлка. Категория
  // (юр/частный) определяется тем, в тарифе какой категории найден посёлок.
  const regional = findRegionalTariff(tariffs, city, weightKg, category, transport, fromCity);
  if (regional) {
    tariff = regional.tariff;
    regionalExtra = regional.regionalExtra;
    regionLabel = regional.regionLabel;
    regionParent = regional.parentCity;
  }

  // Иначе — прямой тариф по городу назначения.
  if (!tariff) {
    tariff = findDeliveryTariff(tariffs, city, category, transport, fromCity);
  }

  // FALLBACK (legacy): отдельный тариф region_delivery с опорным городом (_hubCity).
  if (!tariff) {
    const rd = findDeliveryCategoryTariff(tariffs, city, "region_delivery");
    const hub = rd && rd.weightRanges ? rd.weightRanges._hubCity : "";
    if (rd && hub) {
      const hubTariff = findDeliveryTariff(tariffs, hub, category, transport, fromCity);
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
      error: `Тариф для направления «${fromCity || DEFAULT_FROM_CITY} → ${city}» не найден. Добавьте его в Тарифы (или укажите этот город как регион в тарифе ближайшего города).`,
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
  const baseWhere = regionParent ? `${regionParent} → ${city}` : (hubPoselok ? `${hubCityName} → ${city}` : `${fromCity || DEFAULT_FROM_CITY} → ${city}`);
  let description = `Доставка ${baseWhere} (${baseLabel})`;

  // ТЗ (замечание заказчика): каждая услуга должна идти В НАКЛАДНОЙ ОТДЕЛЬНОЙ
  // СТРОКОЙ со своей суммой, а не одной строкой с длинной расшифровкой.
  //
  // Составляющие и раньше считались по отдельности, но наружу отдавались
  // схлопнутыми: одно число `sum` и склеенный текст `description`. Теперь
  // рядом отдаётся `lines` — те же составляющие списком.
  //
  // ПОЧЕМУ ЧЕРЕЗ add(). Соблазн был дописать lines.push() рядом с каждым
  // существующим `sum += …`. Так разбивка гарантированно разъехалась бы с
  // итогом при первой же правке: кто-то поправит слагаемое и забудет строку.
  // Разбивка, которая не сходится с итогом, хуже одной строки — она врёт
  // молча. Поэтому прибавление к сумме и добавление строки — одно действие.
  //
  // `sum` и `description` остаются как были: их читают пересчёт, карточка
  // частной и отчёты. Поле только добавляется.
  const lines = [{ key: "transport", name: `Перевозка ${baseWhere} (${baseLabel})`, amount: base }];
  const add = (key, name, amount) => {
    sum += amount;
    lines.push({ key, name, amount });
  };

  // ТЗ: доставка теперь по галочке. Раньше прибавлялась безусловно.
  if (withDelivery && rangeDelivery > 0) {
    add("delivery", "Доставка", rangeDelivery);
    description += wp.deliveryMode === "perKg"
      ? ` + доставка диапазона ${toNum(wp.delivery).toLocaleString()} тг/кг × ${weightKg} кг`
      : ` + доставка диапазона ${rangeDelivery.toLocaleString()} тг`;
  }

  // ТЗ: ЗАБОР ГРУЗА — третий тариф со своей градацией по тем же диапазонам.
  // Считается ровно как доставка и добавляется ОТДЕЛЬНОЙ строкой в описание,
  // чтобы в чеке было видно, из чего сложилась сумма.
  const rangePickup = wp.pickupMode === "perKg" ? toNum(wp.pickup) * weightKg : toNum(wp.pickup);
  if (withPickup && rangePickup > 0) {
    add("pickup", "Забор груза", rangePickup);
    description += wp.pickupMode === "perKg"
      ? ` + забор груза ${toNum(wp.pickup).toLocaleString()} тг/кг × ${weightKg} кг`
      : ` + забор груза ${rangePickup.toLocaleString()} тг`;
  }

  // 2) Доплата за посёлок внутри тарифа (_regionalDeliveries) — приоритетный механизм.
  if (regionalExtra > 0) {
    add("region", `Регион «${regionLabel}»`, regionalExtra);
    description += ` + ${regionalExtra.toLocaleString()} тг регион «${regionLabel}»`;
  }

  // 2a) Доп. доставка по городу (отдельная категория city_delivery города назначения)
  if (cityDelivery) {
    const cd = findDeliveryCategoryTariff(tariffs, city, "city_delivery");
    if (cd) {
      const s = toNum(weightPrice(cd.weightRanges || {}, weightKg).sum);
      if (s > 0) {
        add("city_delivery", "Доставка по городу", s);
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
        add("region_delivery", `Доставка в регион «${regionPoselok}»`, s);
        description += ` + доставка в регион «${regionPoselok}» ${s.toLocaleString()} тг`;
      }
    }
  }

  // 2c) Категория габарита (частные лица): надбавка к тарифу.
  //     medium → _sizeMedium (по умолч. 1000), large → _sizeLarge (по умолч. 2000).
  if (sizeCategory === "medium" || sizeCategory === "large") {
    const extra = sizeCategory === "large" ? toNum(wr._sizeLarge) : toNum(wr._sizeMedium);
    if (extra > 0) {
      add("size", `Габарит: ${sizeCategory === "large" ? "большая" : "средняя"}`, extra);
      description += ` + габарит ${sizeCategory === "large" ? "большая" : "средняя"} ${extra.toLocaleString()} тг`;
    }
  }

  const unloadPerSeat = toNum(wr._unloadPerSeat);
  if (unloadPerSeat > 0 && seats > 0) {
    add("unload", `Выгрузка, ${seats} мест`, unloadPerSeat * seats);
    description += ` + выгрузка ${seats} мест × ${unloadPerSeat.toLocaleString()} тг`;
  }

  // 5) ПРР: ручная = ставка × вес; палетная = ставка × кол-во палет.
  //    (_prrManual — тг/кг, _prrPallet — тг за палету)
  if (prrType === 'manual') {
    const rate = toNum(wr._prrManual);
    if (rate > 0 && weightKg > 0) {
      add("prr", "ПРР ручная", rate * weightKg);
      description += ` + ПРР ручная ${rate.toLocaleString()} тг/кг × ${weightKg} кг`;
    }
  } else if (prrType === 'pallet') {
    const rate = toNum(wr._prrPallet);
    if (rate > 0 && pallets > 0) {
      add("prr", `ПРР палетная, ${pallets} пал.`, rate * pallets);
      description += ` + ПРР палетная ${rate.toLocaleString()} тг × ${pallets} пал.`;
    }
  }

  // 6) Хранение: по весу (вес × ставка × дни) или по кубам (объём × ставка × дни).
  //    Отдельная надбавка, не участвует в max(вес, куб) основной базы.
  if (storageDays > 0) {
    if (storageMode === 'weight') {
      const rate = toNum(wr._storagePerKg);
      if (rate > 0 && weightKg > 0) {
        add("storage", `Хранение, ${storageDays} дн.`, weightKg * rate * storageDays);
        description += ` + хранение ${weightKg} кг × ${rate.toLocaleString()} тг × ${storageDays} дн.`;
      }
    } else if (storageMode === 'cube') {
      const rate = toNum(wr._storagePerCubic);
      if (rate > 0 && volumeM3 > 0) {
        add("storage", `Хранение, ${storageDays} дн.`, volumeM3 * rate * storageDays);
        description += ` + хранение ${volumeM3} м³ × ${rate.toLocaleString()} тг × ${storageDays} дн.`;
      }
    }
  }

  const raw = sum;
  sum = Math.ceil(sum); // округление в большую сторону (Правила ТЭУ)
  if (sum <= 0) {
    return { ok: false, error: "Не удалось рассчитать стоимость (проверьте суммы в тарифе)." };
  }

  // Итог округляется вверх, а строки — нет. Копейки округления надо куда-то
  // деть, иначе сумма строк в накладной не сойдётся с «Итого», и менеджер
  // будет объяснять клиенту недостающий тенге. Отдаём их «Перевозке»: это
  // база, и именно она чаще прочих даёт дробь (ставка × вес).
  if (lines.length) {
    lines[0].amount = round2(lines[0].amount + (sum - raw));
    // Остальные слагаемые могли накопить хвост двоичной арифметики
    // (0.1 + 0.2). Подчищаем, чтобы инвариант «сумма строк = sum» держался
    // точно, а не «почти».
    for (let i = 1; i < lines.length; i++) lines[i].amount = round2(lines[i].amount);
    const drift = round2(sum - lines.reduce((a, l) => a + l.amount, 0));
    if (drift !== 0) lines[0].amount = round2(lines[0].amount + drift);
  }

  return { ok: true, sum, description, tariff, lines };
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