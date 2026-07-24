// Тесты движка расчёта тарифов. Запуск: npm test  (или node src/shared/tariff/calcTariff.test.mjs)
// Без внешних зависимостей — только node:assert. Фикстуры повторяют реальные тарифы из базы
// (Актау / Жанаозен-посёлок / Астана), чтобы зафиксировать поведение и не допустить регрессий.
import assert from "node:assert";
import { calcDeliveryPrice, findDeliveryTariff, findRegionalTariff } from "./calcTariff.js";

// ── Фикстуры (срез реальных данных) ─────────────────────────────
const ЖАНАОЗЕН_РЕГИОН = {
  region: "Жанаозен",
  ranges: [
    { mode: "fixed", value: 2000, delivery: 0, maxWeight: 30, deliveryMode: "fixed" },
    { mode: "fixed", value: 3000, delivery: 0, maxWeight: 80, deliveryMode: "fixed" },
    { mode: "fixed", value: 4000, delivery: 0, maxWeight: 150, deliveryMode: "fixed" },
    { mode: "fixed", value: 4000, delivery: 0, maxWeight: null, deliveryMode: "fixed" },
  ],
};

const АКТАУ_PRIVATE = {
  city: "Актау__PRIVATE", fromCity: "Алматы", isPrivate: true, pricePerKg: 0, deliveryPrice: 0,
  weightRanges: {
    _category: "private",
    _ranges: [
      { mode: "fixed", value: 2500, delivery: 100, maxWeight: 10, deliveryMode: "fixed" },
      { mode: "fixed", value: 3500, delivery: 200, maxWeight: 20, deliveryMode: "fixed" },
      { mode: "perKg", value: 160, delivery: 300, maxWeight: null, deliveryMode: "fixed" },
    ],
    _regionalDeliveries: [ЖАНАОЗЕН_РЕГИОН],
  },
};

// Отдельный (устаревший/случайный) standalone-тариф того же посёлка — должен перекрываться посёлком.
const ЖАНАОЗЕН_STANDALONE = {
  city: "Жанаозен__PRIVATE", fromCity: "Алматы", isPrivate: true, pricePerKg: 0, deliveryPrice: 0,
  weightRanges: {
    _category: "private",
    _ranges: [
      { mode: "fixed", value: 3000, delivery: 0, maxWeight: 10, deliveryMode: "fixed" },
      { mode: "fixed", value: 4000, delivery: 0, maxWeight: 20, deliveryMode: "fixed" },
      { mode: "perKg", value: 170, delivery: 0, maxWeight: null, deliveryMode: "fixed" },
    ],
    _regionalDeliveries: [],
  },
};

const АСТАНА_LEGAL = {
  city: "Астана", fromCity: "Алматы", isPrivate: false, pricePerKg: 0, deliveryPrice: 0,
  weightRanges: {
    _category: "legal",
    _ranges: [
      { mode: "fixed", value: 3740, delivery: 1000, maxWeight: 10, deliveryMode: "fixed" },
      { mode: "fixed", value: 3740, delivery: 0, maxWeight: 20, deliveryMode: "fixed" },
      { mode: "fixed", value: 5900, delivery: 0, maxWeight: 30, deliveryMode: "fixed" },
      { mode: "perKg", value: 190, delivery: 0, maxWeight: 50, deliveryMode: "fixed" },
      { mode: "perKg", value: 140, delivery: 0, maxWeight: null, deliveryMode: "fixed" },
    ],
  },
};

// Караганда → Алматы (проверка направления fromCity)
const КАРАГАНДА_АЛМАТЫ = {
  city: "Алматы", fromCity: "Караганда", isPrivate: false, pricePerKg: 0, deliveryPrice: 0,
  weightRanges: { _category: "legal", _ranges: [{ mode: "perKg", value: 90, delivery: 0, maxWeight: null, deliveryMode: "fixed" }] },
};

const TARIFFS = [АКТАУ_PRIVATE, ЖАНАОЗЕН_STANDALONE, АСТАНА_LEGAL, КАРАГАНДА_АЛМАТЫ];

// ── Хелперы ─────────────────────────────────────────────────────
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("✓ " + name); }
  catch (e) { failed++; console.error("✗ FAIL: " + name + "\n   " + e.message); }
}
const sumOf = (opts) => {
  const r = calcDeliveryPrice({ tariffs: TARIFFS, fromCity: "Алматы", seats: 0, ...opts });
  assert.ok(r.ok, `расчёт не удался: ${r.error}`);
  return r;
};

// ── 1. Приоритет посёлка над standalone (баг заказчика) ─────────
test("Жанаозен = Актау + посёлок, а не standalone (25 кг → 6300)", () => {
  const r = sumOf({ city: "Жанаозен", weightKg: 25, category: "private" });
  assert.strictEqual(r.sum, 6300, `ожидалось 6300, получено ${r.sum}`);
  assert.ok(/Актау → Жанаозен/.test(r.description), "база должна быть из Актау");
  assert.ok(/регион «Жанаозен»/.test(r.description), "должна быть доплата за посёлок");
});
test("Жанаозен диапазоны посёлка по весу: 5→4600,15→5700,40→9700,120→23500", () => {
  assert.strictEqual(sumOf({ city: "Жанаозен", weightKg: 5,   category: "private" }).sum, 4600);
  assert.strictEqual(sumOf({ city: "Жанаозен", weightKg: 15,  category: "private" }).sum, 5700);
  assert.strictEqual(sumOf({ city: "Жанаозен", weightKg: 40,  category: "private" }).sum, 9700);
  assert.strictEqual(sumOf({ city: "Жанаозен", weightKg: 120, category: "private" }).sum, 23500);
});
test("Доплата за посёлок НЕ задваивается (25 кг: ровно одно упоминание региона)", () => {
  const r = sumOf({ city: "Жанаозен", weightKg: 25, category: "private" });
  const hits = (r.description.match(/регион «Жанаозен»/g) || []).length;
  assert.strictEqual(hits, 1, `доплата встречается ${hits} раз(а), должна 1`);
});

// ── 2. Прямой тариф города (Актау) не изменился ─────────────────
test("Актау (прямой): 5→2600,25→4300,40→6700,120→19500", () => {
  assert.strictEqual(sumOf({ city: "Актау", weightKg: 5,   category: "private" }).sum, 2600);
  assert.strictEqual(sumOf({ city: "Актау", weightKg: 25,  category: "private" }).sum, 4300);
  assert.strictEqual(sumOf({ city: "Актау", weightKg: 40,  category: "private" }).sum, 6700);
  assert.strictEqual(sumOf({ city: "Актау", weightKg: 120, category: "private" }).sum, 19500);
});

// ── 3. Юрлица (Астана) — обычный прямой тариф ───────────────────
test("Астана (юр): 25→5900 (диапазон ≤30 fixed)", () => {
  assert.strictEqual(sumOf({ city: "Астана", weightKg: 25, category: "legal" }).sum, 5900);
});

// ── 4. Направление fromCity ─────────────────────────────────────
test("Караганда → Алматы матчит только из Караганды", () => {
  const r = sumOf({ city: "Алматы", fromCity: "Караганда", weightKg: 10, category: "legal" });
  assert.strictEqual(r.sum, 900, `10×90=900, получено ${r.sum}`);
  // Из Алматы такого направления нет:
  const r2 = calcDeliveryPrice({ tariffs: TARIFFS, city: "Алматы", fromCity: "Алматы", weightKg: 10, category: "legal" });
  assert.ok(!r2.ok, "Алматы → Алматы не должно находиться");
});

// ── 5. findRegionalTariff находит посёлок, findDeliveryTariff — standalone ──
test("findRegionalTariff(Жанаозен) → родитель Актау; standalone тоже существует", () => {
  const reg = findRegionalTariff(TARIFFS, "Жанаозен", 25, "private", undefined, "Алматы");
  assert.ok(reg && reg.tariff.city === "Актау__PRIVATE", "посёлок должен указывать на Актау");
  const direct = findDeliveryTariff(TARIFFS, "Жанаозен", "private", undefined, "Алматы");
  assert.ok(direct && direct.city === "Жанаозен__PRIVATE", "standalone существует, но движок его игнорирует");
});

// ── 6. Направление: один город назначения, два разных отправления ──
test("Одинаковое назначение, разное отправление → разные тарифы", () => {
  const TWO = [
    { city: "Шымкент", fromCity: "Алматы",  isPrivate: false, weightRanges: { _category: "legal", _ranges: [{ maxWeight: null, mode: "perKg", value: 100 }] } },
    { city: "Шымкент", fromCity: "Астана",  isPrivate: false, weightRanges: { _category: "legal", _ranges: [{ maxWeight: null, mode: "perKg", value: 250 }] } },
  ];
  const rAlm = calcDeliveryPrice({ tariffs: TWO, city: "Шымкент", fromCity: "Алматы", weightKg: 10, category: "legal" });
  const rAst = calcDeliveryPrice({ tariffs: TWO, city: "Шымкент", fromCity: "Астана", weightKg: 10, category: "legal" });
  assert.strictEqual(rAlm.sum, 1000, `Алматы→Шымкент 10×100, получено ${rAlm.sum}`);
  assert.strictEqual(rAst.sum, 2500, `Астана→Шымкент 10×250, получено ${rAst.sum}`);
});

test("Пустое отправление трактуется как «Алматы» (обратная совместимость)", () => {
  const r = calcDeliveryPrice({ tariffs: TARIFFS, city: "Актау", fromCity: "", weightKg: 25, category: "private" });
  assert.strictEqual(r.sum, 4300, `по умолчанию из Алматы, получено ${r.sum}`);
});

// ── Итог ────────────────────────────────────────────────────────
console.log(`\nИтого (движок): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
