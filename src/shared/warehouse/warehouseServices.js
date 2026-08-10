// Прейскурант складских услуг.
//
// ТЗ (прайс заказчика): три группы.
//   1. Упаковка       — скотч, стрейч, пупырка, картон.
//                       Цена зависит от размера места: 30×30×30 / 50×50×50 / 100×100×100.
//   2. Палеты и ящики — палета-стрейч, палета-картон, ящик деревянный,
//                       стяжная лента, деревянная обрешётка.
//                       Диапазоны свои: до 50 см / до 100 см / свыше 100 см.
//   3. Прочие         — сортировка, маркировка, фотоотчёт, видеоотчёт.
//                       Диапазонов НЕТ, одна цена.
// Везде считается «цена диапазона × количество».
//
// ХРАНЕНИЕ И ПРР СЮДА НЕ ВХОДЯТ. Они остаются в обычных тарифах, их считает
// движок перевозки (поля «Хранение» и «ПРР» в форме заявки). Складской прайс
// их не заменяет и не дублирует — иначе одна и та же услуга считалась бы
// дважды по разным правилам.
//
// ГДЕ ХРАНИТСЯ. Одна запись Tariff с city='__WAREHOUSE', весь прейскурант —
// в её weightRanges._groups. У Tariff стоит @@unique([fromCity, city]), поэтому
// «услуга без города» отдельной записью невозможна. Схему БД менять не нужно.
//
// РЕДАКТИРУЕМОСТЬ. Услуги добавляются, переименовываются и удаляются; подписи
// диапазонов правятся. Сами группы фиксированы — их три и они разного
// устройства (две с диапазонами, одна без).

export const WAREHOUSE_TARIFF_CITY = '__WAREHOUSE';

/**
 * Стартовая структура. Цены — null, а НЕ 0: пустая цена и «бесплатно» это
 * разные вещи, незаполненную надо подсветить, чтобы услуга не ушла в накладную
 * молча нулём. Цифры заказчик вобьёт сам.
 */
export const DEFAULT_WAREHOUSE_GROUPS = [
  {
    key: 'packing',
    name: 'Упаковка',
    ranges: [
      { key: 'r30', label: '30×30×30' },
      { key: 'r50', label: '50×50×50' },
      { key: 'r100', label: '100×100×100' },
    ],
    services: [
      { key: 'tape', name: 'Скотч', prices: {} },
      { key: 'stretch', name: 'Стрейч', prices: {} },
      { key: 'bubble', name: 'Пупырка', prices: {} },
      { key: 'carton', name: 'Картон', prices: {} },
    ],
  },
  {
    key: 'pallets',
    name: 'Палеты и ящики',
    ranges: [
      { key: 'u50', label: 'до 50 см' },
      { key: 'u100', label: 'до 100 см' },
      { key: 'o100', label: 'свыше 100 см' },
    ],
    services: [
      { key: 'pallet_stretch', name: 'Палета-стрейч', prices: {} },
      { key: 'pallet_carton', name: 'Палета-картон', prices: {} },
      { key: 'wood_box', name: 'Ящик деревянный', prices: {} },
      { key: 'strap', name: 'Стяжная лента', prices: {} },
      { key: 'wood_crate', name: 'Деревянная обрешётка', prices: {} },
    ],
  },
  {
    key: 'other',
    name: 'Прочие услуги',
    ranges: [],                       // пусто = цена одна, без диапазонов
    services: [
      { key: 'sorting', name: 'Сортировка', price: null },
      { key: 'marking', name: 'Маркировка', price: null },
      { key: 'photo', name: 'Фотоотчёт', price: null },
      { key: 'video', name: 'Видеоотчёт', price: null },
    ],
  },
];

/** Цена может быть не задана — тогда null, а не 0. */
function toPrice(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toQty(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseRanges(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const p = JSON.parse(String(raw));
    return p && typeof p === 'object' ? p : {};
  } catch {
    return {};
  }
}

export function findWarehouseTariff(tariffs) {
  return (tariffs || []).find((t) => t && t.city === WAREHOUSE_TARIFF_CITY) || null;
}

const clone = (v) => JSON.parse(JSON.stringify(v));

/**
 * Прейскурант из тарифов. Записи нет или она пустая — стартовая структура,
 * чтобы администратор увидел строки и просто вписал цены.
 */
export function readWarehouseGroups(tariffs) {
  const t = findWarehouseTariff(tariffs);
  const raw = parseRanges(t?.weightRanges)._groups;
  if (!Array.isArray(raw) || raw.length === 0) return clone(DEFAULT_WAREHOUSE_GROUPS);

  return raw
    .filter((g) => g && typeof g === 'object')
    .map((g, gi) => {
      const ranges = Array.isArray(g.ranges)
        ? g.ranges
            .filter((r) => r && r.key)
            .map((r) => ({ key: String(r.key), label: String(r.label || r.key) }))
        : [];
      return {
        key: String(g.key || `grp${gi + 1}`),
        name: String(g.name || ''),
        ranges,
        services: Array.isArray(g.services)
          ? g.services
              .filter((s) => s && typeof s === 'object')
              .map((s, si) => {
                const base = { key: String(s.key || `svc${si + 1}`), name: String(s.name || '') };
                if (ranges.length === 0) return { ...base, price: toPrice(s.price) };
                const prices = {};
                ranges.forEach((r) => { prices[r.key] = toPrice(s.prices?.[r.key]); });
                return { ...base, prices };
              })
          : [],
      };
    });
}

/** Тело weightRanges для сохранения. Безымянные услуги отбрасываются. */
export function buildWarehouseRanges(groups) {
  return {
    _category: 'warehouse',
    _groups: (groups || []).map((g) => {
      const ranges = (g.ranges || [])
        .filter((r) => r && r.key && String(r.label || '').trim())
        .map((r) => ({ key: String(r.key), label: String(r.label).trim() }));
      return {
        key: String(g.key),
        name: String(g.name || '').trim(),
        ranges,
        services: (g.services || [])
          .filter((s) => s && String(s.name || '').trim())
          .map((s, si) => {
            const base = { key: String(s.key || `svc${si + 1}`), name: String(s.name).trim() };
            if (ranges.length === 0) return { ...base, price: toPrice(s.price) };
            const prices = {};
            ranges.forEach((r) => { prices[r.key] = toPrice(s.prices?.[r.key]); });
            return { ...base, prices };
          }),
      };
    }),
  };
}

/** Цена услуги: для группы с диапазонами — по ключу диапазона, иначе одна. */
export function priceOf(group, service, rangeKey) {
  if (!service) return null;
  if (!group || (group.ranges || []).length === 0) return toPrice(service.price);
  return toPrice(service.prices?.[rangeKey]);
}

/** Есть ли у услуги хоть одна незаполненная цена — для подсветки в прейскуранте. */
export function hasMissingPrice(group, service) {
  if (!group || (group.ranges || []).length === 0) return priceOf(group, service) === null;
  return (group.ranges || []).some((r) => priceOf(group, service, r.key) === null);
}

/**
 * Название позиции в накладной. Диапазон входит в название: иначе три строки
 * «Скотч» с разными ценами выглядят в документе как ошибка.
 */
export function positionTitle(group, service, rangeKey) {
  const name = String(service?.name || '').trim();
  const range = (group?.ranges || []).find((r) => r.key === rangeKey);
  return range ? `${name}, ${range.label}` : name;
}

/**
 * Позиция для списка «добавлено» и, дальше, для таблицы услуг накладной.
 * Формат строки совпадает с ручным вводом ({name, qty, price, total}) —
 * поэтому печать складской накладной и её итог работают без правок.
 *
 * @returns {{ok:false, reason:string} | {ok:true, row:object}}
 */
export function buildPosition(group, service, rangeKey, qty, makeId) {
  const n = toQty(qty);
  if (!service) return { ok: false, reason: 'Услуга не выбрана' };
  if (n <= 0) return { ok: false, reason: 'Укажите количество' };
  if ((group?.ranges || []).length > 0 && !rangeKey) {
    return { ok: false, reason: 'Выберите диапазон размера' };
  }
  const price = priceOf(group, service, rangeKey);
  if (price === null) {
    // Не молчим и не считаем нулём: цена не заведена — это ошибка настройки,
    // а не бесплатная услуга.
    return { ok: false, reason: `Цена не задана: ${positionTitle(group, service, rangeKey)}` };
  }
  return {
    ok: true,
    row: {
      id: makeId ? makeId() : `${group?.key}-${service.key}-${rangeKey || ''}-${n}`,
      name: positionTitle(group, service, rangeKey),
      qty: n,
      price,
      total: n * price,
    },
  };
}

/** Итог по набранным позициям. */
export function draftTotal(rows) {
  return (rows || []).reduce((acc, r) => acc + (Number(r?.total) || 0), 0);
}
