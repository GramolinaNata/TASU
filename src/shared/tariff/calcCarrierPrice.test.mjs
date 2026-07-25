// Тесты расчёта выплаты перевозчику/представителю. Запуск: npm test
// Главное, что фиксируется: СТАРЫЕ плоские тарифы считаются ровно как раньше
// (ставка × вес), новые — по диапазонам.
import assert from "node:assert";
import { calcCarrierPrice, hasRanges } from "./calcCarrierPrice.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("✓ " + name); }
  catch (e) { failed++; console.error("✗ FAIL: " + name + "\n   " + e.message); }
}

// Старый плоский тариф — как лежит в базе у заказчика сейчас.
const ПЛОСКИЙ = { city: "Актау__CARRIERS", pricePerKg: 65, weightRanges: { _category: "carriers" } };

// Новый тариф с диапазонами (RangesEditor).
const ДИАПАЗОНЫ = {
  city: "Атырау__CARRIERS", pricePerKg: 0,
  weightRanges: {
    _category: "carriers",
    _ranges: [
      { maxWeight: 100,  mode: "fixed", value: 15000, delivery: 0, deliveryMode: "fixed" },
      { maxWeight: 500,  mode: "perKg", value: 120,   delivery: 0, deliveryMode: "fixed" },
      { maxWeight: null, mode: "perKg", value: 90,    delivery: 0, deliveryMode: "fixed" },
    ],
  },
};

// ── 1. Старый плоский тариф: поведение НЕ меняется ──────────────
test("Плоская ставка: сумма = ставка × вес (65 × 4788 = 311 220)", () => {
  const r = calcCarrierPrice(ПЛОСКИЙ, 4788);
  assert.strictEqual(r.sum, 311220);
  assert.strictEqual(r.rate, 65);
  assert.strictEqual(r.byRanges, false);
  assert.strictEqual(r.label, "65 тг/кг");
});
test("Плоская ставка на малом весе (65 × 24 = 1560)", () => {
  assert.strictEqual(calcCarrierPrice(ПЛОСКИЙ, 24).sum, 1560);
});
test("Плоская ставка 0 → сумма 0, тариф считается ненайденным", () => {
  const r = calcCarrierPrice({ pricePerKg: 0, weightRanges: {} }, 100);
  assert.strictEqual(r.sum, 0);
  assert.strictEqual(r.found, false);
});
test("Тарифа нет вовсе → 0 и подпись «тариф не найден»", () => {
  const r = calcCarrierPrice(null, 100);
  assert.strictEqual(r.sum, 0);
  assert.strictEqual(r.label, "тариф не найден");
});
test("Пустой _ranges = старый формат (fallback на pricePerKg)", () => {
  const t = { pricePerKg: 65, weightRanges: { _category: "carriers", _ranges: [] } };
  const r = calcCarrierPrice(t, 100);
  assert.strictEqual(r.sum, 6500);
  assert.strictEqual(r.byRanges, false);
});

// ── 2. Диапазоны ────────────────────────────────────────────────
test("Диапазон fixed: 80 кг → 15 000 тг целиком", () => {
  const r = calcCarrierPrice(ДИАПАЗОНЫ, 80);
  assert.strictEqual(r.sum, 15000);
  assert.strictEqual(r.byRanges, true);
  assert.match(r.label, /до 100 кг/);
});
test("Диапазон perKg: 300 кг × 120 = 36 000", () => {
  assert.strictEqual(calcCarrierPrice(ДИАПАЗОНЫ, 300).sum, 36000);
});
test("Открытый диапазон «свыше»: 1000 кг × 90 = 90 000", () => {
  const r = calcCarrierPrice(ДИАПАЗОНЫ, 1000);
  assert.strictEqual(r.sum, 90000);
  assert.match(r.label, /свыше/);
});
test("Эффективная ставка = сумма / вес (для снапшота ведомости)", () => {
  const r = calcCarrierPrice(ДИАПАЗОНЫ, 300);
  assert.strictEqual(r.rate, 120);
  const f = calcCarrierPrice(ДИАПАЗОНЫ, 100);
  assert.strictEqual(f.rate, 150, "15000 / 100 кг = 150 тг/кг");
});

// ── 3. Граничные веса ───────────────────────────────────────────
test("Ровно на границе берётся ВЕРХНЯЯ граница диапазона", () => {
  assert.strictEqual(calcCarrierPrice(ДИАПАЗОНЫ, 100).sum, 15000, "100 кг → диапазон «до 100»");
  assert.strictEqual(calcCarrierPrice(ДИАПАЗОНЫ, 101).sum, 12120, "101 кг → следующий, 101×120");
  assert.strictEqual(calcCarrierPrice(ДИАПАЗОНЫ, 500).sum, 60000, "500 кг → «до 500», 500×120");
  assert.strictEqual(calcCarrierPrice(ДИАПАЗОНЫ, 501).sum, 45090, "501 кг → «свыше», 501×90");
});
test("Вес 0 → сумма 0, ставка 0 (без деления на ноль)", () => {
  const r = calcCarrierPrice(ДИАПАЗОНЫ, 0);
  assert.strictEqual(r.sum, 15000, "фикс. диапазон не зависит от веса");
  assert.strictEqual(r.rate, 0, "деления на ноль быть не должно");
  assert.ok(Number.isFinite(r.rate));
});
test("Диапазоны в произвольном порядке сортируются", () => {
  const t = { weightRanges: { _ranges: [
    { maxWeight: null, mode: "perKg", value: 90 },
    { maxWeight: 100, mode: "fixed", value: 15000 },
  ] } };
  assert.strictEqual(calcCarrierPrice(t, 50).sum, 15000);
  assert.strictEqual(calcCarrierPrice(t, 500).sum, 45000);
});
test("Доплата диапазона не пропадает молча", () => {
  const t = { weightRanges: { _ranges: [{ maxWeight: null, mode: "perKg", value: 100, delivery: 5000, deliveryMode: "fixed" }] } };
  assert.strictEqual(calcCarrierPrice(t, 10).sum, 6000, "100×10 + 5000");
});
test("Мусор в весе не роняет расчёт", () => {
  assert.strictEqual(calcCarrierPrice(ПЛОСКИЙ, "abc").sum, 0);
  assert.strictEqual(calcCarrierPrice(ПЛОСКИЙ, null).sum, 0);
});
test("hasRanges отличает новый тариф от старого", () => {
  assert.strictEqual(hasRanges(ДИАПАЗОНЫ), true);
  assert.strictEqual(hasRanges(ПЛОСКИЙ), false);
  assert.strictEqual(hasRanges(null), false);
});

// ── 4. Совместимость: реальные ставки из базы заказчика ─────────
test("Реальные ставки из базы (65 и 120 тг/кг) считаются как раньше", () => {
  assert.strictEqual(calcCarrierPrice({ pricePerKg: 120, weightRanges: {} }, 24).sum, 2880);
  assert.strictEqual(calcCarrierPrice({ pricePerKg: 65, weightRanges: {} }, 257).sum, 16705);
  assert.strictEqual(calcCarrierPrice({ pricePerKg: 65, weightRanges: {} }, 84).sum, 5460);
});

console.log(`\nИтого (calcCarrierPrice): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
