// Тесты групп размеров (частные лица). Запуск: npm test
// Фиксируют формулы объёма/мест/надбавки и обратную совместимость со старым
// одиночным блоком размеров.
import assert from "node:assert";
import {
  normalizeDimGroups, groupVolumeM3, groupsVolumeM3, groupsSeats,
  sizeCategoryRate, sizeSurcharge, sizeSurchargeParts, serializeDimGroups, emptyDimGroup,
  flatSizeSurcharge, pickSizeCategory,
} from "./dimGroups.js";
import { calcDeliveryPrice } from "../tariff/calcTariff.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("✓ " + name); }
  catch (e) { failed++; console.error("✗ FAIL: " + name + "\n   " + e.message); }
}

// Тариф частных с надбавками за габарит (как в базе заказчика).
const ТАРИФ = {
  city: "Актау__PRIVATE", fromCity: "Алматы", isPrivate: true, pricePerKg: 0, deliveryPrice: 0,
  weightRanges: {
    _category: "private",
    _sizeMedium: 1000,
    _sizeLarge: 2000,
    _pricePerCubic: 30000,
    _ranges: [
      { mode: "fixed", value: 2500, delivery: 100, maxWeight: 10, deliveryMode: "fixed" },
      { mode: "fixed", value: 3500, delivery: 200, maxWeight: 20, deliveryMode: "fixed" },
      { mode: "perKg", value: 160, delivery: 300, maxWeight: null, deliveryMode: "fixed" },
    ],
  },
};

// Пример заказчика: 10 мест — 5 одних габаритов, 5 других.
const ДВЕ_ГРУППЫ = [
  { length: 100, width: 50, height: 40, seats: 5, sizeCategory: "medium" },
  { length: 60,  width: 40, height: 30, seats: 5, sizeCategory: "large" },
];

// ── 1. Объём и места по нескольким группам ──────────────────────
test("Объём = Σ(Д×Ш×В×мест)/1 000 000 по двум группам", () => {
  // 100×50×40×5 = 1 000 000 см³ = 1 м³;  60×40×30×5 = 360 000 см³ = 0.36 м³
  assert.strictEqual(groupVolumeM3(ДВЕ_ГРУППЫ[0]), 1);
  assert.strictEqual(groupVolumeM3(ДВЕ_ГРУППЫ[1]), 0.36);
  assert.strictEqual(groupsVolumeM3(ДВЕ_ГРУППЫ), 1.36);
});
test("Мест = сумма по группам (5 + 5 = 10)", () => {
  assert.strictEqual(groupsSeats(ДВЕ_ГРУППЫ), 10);
});

// ── 2. Надбавка за габарит по группам ───────────────────────────
test("Надбавка = Σ(ставка_i × мест_i): 1000×5 + 2000×5 = 15000", () => {
  assert.strictEqual(sizeSurcharge(ДВЕ_ГРУППЫ, ТАРИФ), 15000);
});
test("Маленькая категория надбавки не даёт", () => {
  const g = [{ length: 10, width: 10, height: 10, seats: 7, sizeCategory: "" }];
  assert.strictEqual(sizeSurcharge(g, ТАРИФ), 0);
  assert.strictEqual(sizeCategoryRate(ТАРИФ, ""), 0);
});
test("Ставки берутся из тарифа, своих умолчаний нет", () => {
  assert.strictEqual(sizeCategoryRate(ТАРИФ, "medium"), 1000);
  assert.strictEqual(sizeCategoryRate(ТАРИФ, "large"), 2000);
  const без = { weightRanges: { _category: "private" } };
  assert.strictEqual(sizeCategoryRate(без, "large"), 0, "нет ставки в тарифе → нет надбавки");
});
test("Расшифровка надбавки по группам", () => {
  const parts = sizeSurchargeParts(ДВЕ_ГРУППЫ, ТАРИФ);
  assert.strictEqual(parts.length, 2);
  assert.deepStrictEqual(parts.map(p => p.sum), [5000, 10000]);
  assert.deepStrictEqual(parts.map(p => p.label), ["средняя", "большая"]);
});

// ── 3. Обратная совместимость: старый одиночный блок ────────────
test("Старый формат (length/width/height/seats) → одна группа", () => {
  const старая = { length: 100, width: 50, height: 40, seats: 5, sizeCategory: "medium" };
  const g = normalizeDimGroups(старая);
  assert.strictEqual(g.length, 1);
  assert.strictEqual(groupsVolumeM3(g), 1);
  assert.strictEqual(groupsSeats(g), 5);
  assert.strictEqual(sizeSurcharge(g, ТАРИФ), 5000, "надбавка старой = ставка × мест");
});
test("Старый формат без размеров, места из totals", () => {
  const старая = { sizeCategory: "large", totals: { seats: 3 } };
  const g = normalizeDimGroups(старая);
  assert.strictEqual(groupsSeats(g), 3);
  assert.strictEqual(sizeSurcharge(g, ТАРИФ), 6000);
});
test("Новый формат details.dims читается как есть", () => {
  const g = normalizeDimGroups({ dims: ДВЕ_ГРУППЫ });
  assert.strictEqual(g.length, 2);
  assert.strictEqual(groupsVolumeM3(g), 1.36);
});
test("Пусто → одна пустая группа (в форме всегда есть строка)", () => {
  assert.deepStrictEqual(normalizeDimGroups(null), [emptyDimGroup()]);
  assert.deepStrictEqual(normalizeDimGroups({}), [emptyDimGroup()]);
  assert.strictEqual(normalizeDimGroups([]).length, 1);
});

// ── 4. Граничные ────────────────────────────────────────────────
test("Одна группа считается как раньше", () => {
  const g = [{ length: 100, width: 50, height: 40, seats: 5, sizeCategory: "" }];
  assert.strictEqual(groupsVolumeM3(g), 1);
  assert.strictEqual(groupsSeats(g), 5);
});
test("Пустые размеры → объём 0 (расчёт уйдёт по весу)", () => {
  const g = [{ length: "", width: "", height: "", seats: 4, sizeCategory: "" }];
  assert.strictEqual(groupsVolumeM3(g), 0);
  assert.strictEqual(groupsSeats(g), 4, "места считаются даже без размеров");
});
test("Мест 0 → группа не даёт ни объёма, ни надбавки", () => {
  const g = [{ length: 100, width: 50, height: 40, seats: 0, sizeCategory: "large" }];
  assert.strictEqual(groupsVolumeM3(g), 0);
  assert.strictEqual(sizeSurcharge(g, ТАРИФ), 0);
});
test("Мусор в полях не роняет расчёт", () => {
  const g = [{ length: "abc", width: null, height: undefined, seats: "два", sizeCategory: "medium" }];
  assert.strictEqual(groupsVolumeM3(g), 0);
  assert.strictEqual(groupsSeats(g), 0);
  assert.strictEqual(sizeSurcharge(g, ТАРИФ), 0);
});

// ── 5. Сохранение в details ─────────────────────────────────────
test("serializeDimGroups: пустые группы выбрасываются, числа приводятся", () => {
  const g = [
    { length: "100", width: "50", height: "40", seats: "5", sizeCategory: "medium" },
    emptyDimGroup(),
  ];
  assert.deepStrictEqual(serializeDimGroups(g), [
    { length: 100, width: 50, height: 40, seats: 5, sizeCategory: "medium" },
  ]);
});

// ── 6. Стыковка с движком (движок НЕ менялся) ───────────────────
test("Итог = движок(объём групп, sizeCategory пустой) + надбавка по группам", () => {
  // Вес 25 кг → база по весу 160×25 + доставка 300 = 4300.
  // Куб: 1.36 м³ × 30 000 = 40 800 — больше веса, значит база по кубу.
  const res = calcDeliveryPrice({
    tariffs: [ТАРИФ], city: "Актау", fromCity: "Алматы", weightKg: 25,
    volumeM3: groupsVolumeM3(ДВЕ_ГРУППЫ), seats: groupsSeats(ДВЕ_ГРУППЫ),
    sizeCategory: "", category: "private",
  });
  assert.ok(res.ok, res.error);
  assert.strictEqual(res.sum, 41100, `40800 + 300 доставка диапазона, получено ${res.sum}`);
  const итог = res.sum + sizeSurcharge(ДВЕ_ГРУППЫ, ТАРИФ);
  assert.strictEqual(итог, 56100, "41100 + 15000 надбавка по группам");
});
test("Пустые размеры → движок считает по весу, надбавка отдельно", () => {
  const g = [{ length: "", width: "", height: "", seats: 3, sizeCategory: "medium" }];
  const res = calcDeliveryPrice({
    tariffs: [ТАРИФ], city: "Актау", fromCity: "Алматы", weightKg: 25,
    volumeM3: groupsVolumeM3(g), seats: groupsSeats(g), sizeCategory: "", category: "private",
  });
  assert.strictEqual(res.sum, 4300, "объём 0 → база по весу");
  assert.strictEqual(res.sum + sizeSurcharge(g, ТАРИФ), 7300, "4300 + 1000×3");
});


// ── Новая модель: одна категория на накладную, места вводятся вручную ──
// Заказчик вернул ручной ввод мест, поэтому надбавка считается не по группам,
// а «категория × общее количество мест».
test("flatSizeSurcharge: категория × общее число мест", () => {
  const t = { weightRanges: { _sizeMedium: 500, _sizeLarge: 1200 } };
  assert.strictEqual(flatSizeSurcharge(t, "medium", 3), 1500);
  assert.strictEqual(flatSizeSurcharge(t, "large", 2), 2400);
});
test("flatSizeSurcharge: маленькая категория надбавки не даёт", () => {
  const t = { weightRanges: { _sizeMedium: 500, _sizeLarge: 1200 } };
  assert.strictEqual(flatSizeSurcharge(t, "", 10), 0);
  assert.strictEqual(flatSizeSurcharge(t, null, 10), 0);
});
test("flatSizeSurcharge: нет тарифа или мусор в местах → 0, без NaN", () => {
  assert.strictEqual(flatSizeSurcharge(null, "large", 5), 0);
  const t = { weightRanges: { _sizeLarge: 1000 } };
  assert.strictEqual(flatSizeSurcharge(t, "large", "абв"), 0);
  assert.ok(!Number.isNaN(flatSizeSurcharge(t, "large", undefined)));
});
test("pickSizeCategory: берёт самую дорогую категорию из старых групп", () => {
  assert.strictEqual(pickSizeCategory([{ sizeCategory: "" }, { sizeCategory: "large" }, { sizeCategory: "medium" }]), "large");
  assert.strictEqual(pickSizeCategory([{ sizeCategory: "" }, { sizeCategory: "medium" }]), "medium");
  assert.strictEqual(pickSizeCategory([{ sizeCategory: "" }, { sizeCategory: "" }]), "");
});
test("pickSizeCategory: пусто и мусор не роняют", () => {
  assert.strictEqual(pickSizeCategory([]), "");
  assert.strictEqual(pickSizeCategory(null), "");
  assert.strictEqual(pickSizeCategory([null, undefined]), "");
});
test("Старая модель по группам продолжает считаться (обратная совместимость)", () => {
  const t = { weightRanges: { _sizeMedium: 500, _sizeLarge: 1200 } };
  const groups = [{ sizeCategory: "medium", seats: 2 }, { sizeCategory: "large", seats: 1 }];
  assert.strictEqual(sizeSurcharge(groups, t), 500 * 2 + 1200 * 1);
});

console.log(`\nИтого (dimGroups): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);