// Тесты прейскуранта складских услуг. Запуск: npm test
// Фиксируют: состав групп из прайса заказчика, расчёт «цена диапазона ×
// количество», отказ считать услугу с незаполненной ценой и формат строки,
// уходящей в накладную (он обязан совпадать с ручным вводом).
import assert from "node:assert";
import {
  WAREHOUSE_TARIFF_CITY, DEFAULT_WAREHOUSE_GROUPS,
  findWarehouseTariff, readWarehouseGroups, buildWarehouseRanges,
  priceOf, hasMissingPrice, positionTitle, buildPosition, draftTotal,
} from "./warehouseServices.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("✓ " + name); }
  catch (e) { failed++; console.error("✗ FAIL: " + name + "\n   " + e.message); }
}

const прайс = [
  {
    key: "packing", name: "Упаковка",
    ranges: [{ key: "r30", label: "30×30×30" }, { key: "r50", label: "50×50×50" }, { key: "r100", label: "100×100×100" }],
    services: [
      { key: "tape", name: "Скотч", prices: { r30: 500, r50: 800, r100: 1200 } },
      { key: "bubble", name: "Пупырка", prices: { r30: 300, r50: null, r100: 900 } },
    ],
  },
  {
    key: "pallets", name: "Палеты и ящики",
    ranges: [{ key: "u50", label: "до 50 см" }, { key: "u100", label: "до 100 см" }, { key: "o100", label: "свыше 100 см" }],
    services: [{ key: "wood_box", name: "Ящик деревянный", prices: { u50: 4000, u100: 8000, o100: 15000 } }],
  },
  {
    key: "other", name: "Прочие услуги", ranges: [],
    services: [{ key: "sorting", name: "Сортировка", price: 300 }, { key: "video", name: "Видеоотчёт", price: null }],
  },
];
const g = (k) => прайс.find((x) => x.key === k);
const s = (gk, sk) => g(gk).services.find((x) => x.key === sk);

// ---- состав из прайса заказчика ----

test("Три группы: упаковка, палеты и ящики, прочие", () => {
  assert.deepStrictEqual(DEFAULT_WAREHOUSE_GROUPS.map(x => x.key), ["packing", "pallets", "other"]);
});
test("Упаковка: скотч, стрейч, пупырка, картон + три диапазона размера", () => {
  const p = DEFAULT_WAREHOUSE_GROUPS[0];
  assert.deepStrictEqual(p.services.map(x => x.name), ["Скотч", "Стрейч", "Пупырка", "Картон"]);
  assert.deepStrictEqual(p.ranges.map(r => r.label), ["30×30×30", "50×50×50", "100×100×100"]);
});
test("Палеты: пять услуг из прайса + свои диапазоны", () => {
  const p = DEFAULT_WAREHOUSE_GROUPS[1];
  assert.deepStrictEqual(p.services.map(x => x.name),
    ["Палета-стрейч", "Палета-картон", "Ящик деревянный", "Стяжная лента", "Деревянная обрешётка"]);
  assert.deepStrictEqual(p.ranges.map(r => r.label), ["до 50 см", "до 100 см", "свыше 100 см"]);
});
test("Прочие: без диапазонов, четыре услуги", () => {
  const p = DEFAULT_WAREHOUSE_GROUPS[2];
  assert.strictEqual(p.ranges.length, 0);
  assert.deepStrictEqual(p.services.map(x => x.name), ["Сортировка", "Маркировка", "Фотоотчёт", "Видеоотчёт"]);
});
test("Хранения и ПРР в складском прайсе НЕТ — они в тарифах перевозки", () => {
  const все = DEFAULT_WAREHOUSE_GROUPS.flatMap(x => x.services.map(y => y.name.toLowerCase()));
  assert.ok(!все.some(n => n.includes("хранен")), "хранение просочилось в складской прайс");
  assert.ok(!все.some(n => n.includes("погруз")), "ПРР просочилось в складской прайс");
});
test("Стартовые цены пустые (null), а не нулевые", () => {
  const прочие = DEFAULT_WAREHOUSE_GROUPS[2];
  assert.strictEqual(прочие.services[0].price, null);
  const упак = DEFAULT_WAREHOUSE_GROUPS[0];
  assert.strictEqual(priceOf(упак, упак.services[0], "r30"), null);
});

// ---- чтение и сохранение ----

test("Записи нет — отдаётся стартовая структура", () => {
  assert.strictEqual(readWarehouseGroups([]).length, 3);
  assert.strictEqual(readWarehouseGroups(null).length, 3);
});
test("Запись прейскуранта находится по служебному городу", () => {
  const t = { id: "1", city: WAREHOUSE_TARIFF_CITY, weightRanges: { _groups: прайс } };
  assert.strictEqual(findWarehouseTariff([{ city: "Алматы" }, t]).id, "1");
  assert.strictEqual(findWarehouseTariff([{ city: "Алматы" }]), null);
});
test("weightRanges строкой разбирается", () => {
  const t = [{ city: WAREHOUSE_TARIFF_CITY, weightRanges: JSON.stringify({ _groups: прайс }) }];
  assert.strictEqual(readWarehouseGroups(t)[0].services[0].name, "Скотч");
});
test("Битый JSON не роняет — стартовая структура", () => {
  const t = [{ city: WAREHOUSE_TARIFF_CITY, weightRanges: "{не json" }];
  assert.strictEqual(readWarehouseGroups(t).length, 3);
});
test("Сохранение отбрасывает безымянные услуги", () => {
  const r = buildWarehouseRanges([{ key: "other", name: "Прочие", ranges: [], services: [
    { key: "a", name: "Сортировка", price: 300 }, { key: "b", name: "   ", price: 100 },
  ] }]);
  assert.strictEqual(r._groups[0].services.length, 1);
  assert.strictEqual(r._category, "warehouse");
});
test("Цена строкой из input сохраняется числом, пустая — null", () => {
  const r = buildWarehouseRanges([{ key: "other", name: "П", ranges: [], services: [
    { key: "a", name: "A", price: "750" }, { key: "b", name: "B", price: "" },
  ] }]);
  assert.strictEqual(r._groups[0].services[0].price, 750);
  assert.strictEqual(r._groups[0].services[1].price, null);
});
test("Цены сохраняются только по существующим диапазонам", () => {
  const r = buildWarehouseRanges([{ key: "p", name: "П",
    ranges: [{ key: "r30", label: "30×30×30" }],
    services: [{ key: "tape", name: "Скотч", prices: { r30: 500, r50: 800 } }] }]);
  assert.deepStrictEqual(Object.keys(r._groups[0].services[0].prices), ["r30"]);
});
test("Диапазон без подписи отбрасывается", () => {
  const r = buildWarehouseRanges([{ key: "p", name: "П",
    ranges: [{ key: "a", label: "до 50" }, { key: "b", label: "  " }], services: [] }]);
  assert.strictEqual(r._groups[0].ranges.length, 1);
});

// ---- цены и подсветка ----

test("Цена берётся по выбранному диапазону", () => {
  assert.strictEqual(priceOf(g("packing"), s("packing", "tape"), "r30"), 500);
  assert.strictEqual(priceOf(g("packing"), s("packing", "tape"), "r100"), 1200);
});
test("У группы без диапазонов цена одна", () => {
  assert.strictEqual(priceOf(g("other"), s("other", "sorting")), 300);
});
test("Незаполненная цена подсвечивается", () => {
  assert.ok(hasMissingPrice(g("packing"), s("packing", "bubble")), "пупырка без r50 не подсвечена");
  assert.ok(!hasMissingPrice(g("packing"), s("packing", "tape")));
  assert.ok(hasMissingPrice(g("other"), s("other", "video")));
  assert.ok(!hasMissingPrice(g("other"), s("other", "sorting")));
});

// ---- расчёт позиции ----

test("ПРИМЕР ИЗ ТЗ: скотч, 30×30×30, 5 мест → цена диапазона × 5", () => {
  const r = buildPosition(g("packing"), s("packing", "tape"), "r30", 5, () => "id");
  assert.ok(r.ok);
  assert.strictEqual(r.row.price, 500);
  assert.strictEqual(r.row.qty, 5);
  assert.strictEqual(r.row.total, 2500);
});
test("Название позиции включает диапазон", () => {
  assert.strictEqual(positionTitle(g("packing"), s("packing", "tape"), "r30"), "Скотч, 30×30×30");
  assert.strictEqual(positionTitle(g("pallets"), s("pallets", "wood_box"), "o100"), "Ящик деревянный, свыше 100 см");
});
test("У прочих диапазона в названии нет", () => {
  assert.strictEqual(positionTitle(g("other"), s("other", "sorting")), "Сортировка");
});
test("Формат строки совпадает с ручным вводом — иначе поедет печать", () => {
  const r = buildPosition(g("other"), s("other", "sorting"), null, 3, () => "id");
  assert.deepStrictEqual(Object.keys(r.row).sort(), ["id", "name", "price", "qty", "total"]);
  assert.strictEqual(r.row.total, 900);
});
test("Одна услуга в РАЗНЫХ диапазонах — две независимые позиции", () => {
  const a = buildPosition(g("packing"), s("packing", "tape"), "r30", 5, () => "1");
  const b = buildPosition(g("packing"), s("packing", "tape"), "r50", 2, () => "2");
  assert.strictEqual(a.row.total, 2500);
  assert.strictEqual(b.row.total, 1600);
  assert.notStrictEqual(a.row.name, b.row.name);
});
test("Услуга с незаполненной ценой НЕ добавляется молча нулём", () => {
  const r = buildPosition(g("packing"), s("packing", "bubble"), "r50", 3, () => "id");
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /Цена не задана/);
});
test("Без количества и без диапазона не добавляется", () => {
  assert.strictEqual(buildPosition(g("packing"), s("packing", "tape"), "r30", 0, () => "id").ok, false);
  assert.strictEqual(buildPosition(g("packing"), s("packing", "tape"), "", 5, () => "id").ok, false);
  assert.strictEqual(buildPosition(g("packing"), null, "r30", 5, () => "id").ok, false);
});
test("Количество строкой из input считается верно", () => {
  assert.strictEqual(buildPosition(g("packing"), s("packing", "tape"), "r30", "4", () => "id").row.total, 2000);
});
test("Отрицательное количество не проходит", () => {
  assert.strictEqual(buildPosition(g("packing"), s("packing", "tape"), "r30", -2, () => "id").ok, false);
});
test("Итог по набранным позициям", () => {
  const rows = [
    buildPosition(g("packing"), s("packing", "tape"), "r30", 5, () => "1").row,
    buildPosition(g("other"), s("other", "sorting"), null, 3, () => "2").row,
  ];
  assert.strictEqual(draftTotal(rows), 3400);
  assert.strictEqual(draftTotal([]), 0);
  assert.strictEqual(draftTotal(null), 0);
});

console.log(`\nИтого (warehouseServices): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
