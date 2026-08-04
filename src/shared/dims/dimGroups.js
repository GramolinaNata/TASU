// ============================================================
// Группы размеров груза (частные лица).
//
// Одна накладная может содержать несколько групп: например, 10 мест — 5 одних
// габаритов и 5 других. У каждой группы свои Д×Ш×В, своё количество мест и своя
// категория габарита (размер у групп разный — значит и надбавка за размер разная).
//
//   объём     = Σ(Д_i × Ш_i × В_i × мест_i) / 1 000 000
//   мест      = Σ мест_i
//   надбавка  = Σ(ставка_категории_i × мест_i)
//
// Движок расчёта (calcTariff.calcDeliveryPrice) НЕ трогается: он получает
// объём и общее число мест, а надбавку за габарит по группам считает эта
// функция и прибавляет вызывающий код (в движке надбавка одна на заявку).
//
// Обратная совместимость: накладные со старым одиночным блоком размеров
// (length/width/height + seats + sizeCategory) читаются как ОДНА группа.
// ============================================================

function toNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export function emptyDimGroup() {
  return { length: "", width: "", height: "", seats: "", sizeCategory: "" };
}

// Привести что угодно к массиву групп. Источник:
//   • массив групп (новый формат details.dims)
//   • объект-накладная/форма со старыми полями length/width/height/seats/sizeCategory
//   • пусто → одна пустая группа (в форме всегда есть минимум одна строка)
export function normalizeDimGroups(source) {
  const raw = Array.isArray(source)
    ? source
    : (source && Array.isArray(source.dims) ? source.dims : null);

  if (raw && raw.length > 0) {
    return raw.map((g) => ({
      length: g && g.length != null ? g.length : "",
      width: g && g.width != null ? g.width : "",
      height: g && g.height != null ? g.height : "",
      seats: g && g.seats != null ? g.seats : "",
      sizeCategory: (g && g.sizeCategory) || "",
    }));
  }

  // Старый формат: один блок размеров на всю накладную.
  if (source && (source.length || source.width || source.height || source.sizeCategory)) {
    return [{
      length: source.length != null ? source.length : "",
      width: source.width != null ? source.width : "",
      height: source.height != null ? source.height : "",
      // мест в старом формате — общее число по накладной
      seats: source.seats != null ? source.seats : (source.totals && source.totals.seats != null ? source.totals.seats : ""),
      sizeCategory: source.sizeCategory || "",
    }];
  }

  return [emptyDimGroup()];
}

// Объём одной группы, м³ (см³ / 1 000 000).
export function groupVolumeM3(g) {
  if (!g) return 0;
  return (toNum(g.length) * toNum(g.width) * toNum(g.height) * toNum(g.seats)) / 1_000_000;
}

// Общий объём по всем группам, м³.
// Округляем до 6 знаков: сумма долей даёт мусор плавающей точки
// (1 + 0.36 = 1.3599999999999999), а объём идёт и в подписи, и в описание расчёта.
export function groupsVolumeM3(groups) {
  const sum = (groups || []).reduce((acc, g) => acc + groupVolumeM3(g), 0);
  return Math.round(sum * 1_000_000) / 1_000_000;
}

// Общее количество мест — сумма по группам (это значение уходит в totals.seats).
export function groupsSeats(groups) {
  return (groups || []).reduce((acc, g) => acc + toNum(g && g.seats), 0);
}

// Ставка надбавки за категорию габарита из тарифа.
// medium → _sizeMedium, large → _sizeLarge. Маленькая («») — без надбавки.
// Значения берём из тарифа, своих умолчаний не выдумываем (как в движке).
export function sizeCategoryRate(tariff, category) {
  if (category !== "medium" && category !== "large") return 0;
  const wr = (tariff && tariff.weightRanges && typeof tariff.weightRanges === "object") ? tariff.weightRanges : {};
  return toNum(category === "large" ? wr._sizeLarge : wr._sizeMedium);
}

// Надбавка за габариты по группам: Σ(ставка категории × мест группы).
// Группы разделены по размеру, поэтому надбавка считается на каждое место
// своей группы, а не один раз на всю накладную.
export function sizeSurcharge(groups, tariff) {
  return (groups || []).reduce(
    (acc, g) => acc + sizeCategoryRate(tariff, g && g.sizeCategory) * toNum(g && g.seats),
    0
  );
}

// Расшифровка надбавки для описания расчёта (в чек/подсказку).
export function sizeSurchargeParts(groups, tariff) {
  const parts = [];
  (groups || []).forEach((g, i) => {
    const rate = sizeCategoryRate(tariff, g && g.sizeCategory);
    const seats = toNum(g && g.seats);
    if (rate > 0 && seats > 0) {
      parts.push({
        index: i,
        label: g.sizeCategory === "large" ? "большая" : "средняя",
        rate,
        seats,
        sum: rate * seats,
      });
    }
  });
  return parts;
}

// Для сохранения в details: убираем пустые группы, числа приводим к числам.
export function serializeDimGroups(groups) {
  return (groups || [])
    .filter((g) => g && (toNum(g.length) > 0 || toNum(g.width) > 0 || toNum(g.height) > 0 || toNum(g.seats) > 0 || g.sizeCategory))
    .map((g) => ({
      length: toNum(g.length),
      width: toNum(g.width),
      height: toNum(g.height),
      seats: toNum(g.seats),
      sizeCategory: g.sizeCategory || "",
    }));
}

// ============================================================
// МОДЕЛЬ ПОСЛЕ ВОЗВРАТА РУЧНОГО ВВОДА МЕСТ (частные лица)
//
// Заказчик вернул ручной ввод количества мест одним полем на накладную.
// Раз общее число мест задаётся вручную, разбивка «места по группам» перестала
// им управлять — значит и категория габарита стала одна на всю накладную,
// как было до появления групп.
//
// Группы размеров остались, но ТОЛЬКО ради объёма: разногабаритный груз
// по-прежнему считается как Σ(Д×Ш×В×шт) — поле «шт» внутри группы это
// множитель объёма, а не источник общего числа мест.
//
// Старые функции sizeSurcharge / sizeSurchargeParts НЕ удалены: по ним читаются
// накладные, оформленные в прежней модели, и на них держатся тесты.
// ============================================================

// Надбавка за габариты в новой модели: одна категория на накладную,
// умноженная на общее количество мест, введённое вручную.
export function flatSizeSurcharge(tariff, sizeCategory, seats) {
  return sizeCategoryRate(tariff, sizeCategory) * toNum(seats);
}

// Категория габарита для накладной, оформленной в СТАРОЙ модели (по группам).
// Берём самую «дорогую» из встречающихся: если хоть одна группа была большой —
// вся накладная большая. Занижать нельзя: это уменьшило бы уже выставленную
// клиенту сумму при повторном открытии накладной.
export function pickSizeCategory(groups) {
  const list = groups || [];
  if (list.some((g) => g && g.sizeCategory === "large")) return "large";
  if (list.some((g) => g && g.sizeCategory === "medium")) return "medium";
  return "";
}
