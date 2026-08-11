// Тесты выгрузки для отчёта. Запуск: node src/shared/report/unloadSum.test.mjs
import assert from "node:assert";
import { unloadFromServices, unloadFromField, unloadOfRequest, unloadOfRequests, isSimple } from "./unloadSum.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`✓ ${name}`); }
  catch (e) { failed++; console.log(`✗ ${name}\n   ${e.message}`); }
}

// Тариф с выгрузкой 1000 тг/место — как в реальной базе.
const ТАРИФЫ = [
  { city: "Актау", fromCity: "Алматы", isPrivate: true, weightRanges: {
      _category: "private", _unloadPerSeat: 1000,
      _ranges: [{ maxWeight: null, mode: "fixed", value: 4000, delivery: 300, deliveryMode: "fixed" }] } },
  { city: "Тараз", fromCity: "Алматы", isPrivate: false, weightRanges: {
      _category: "legal", _unloadPerSeat: 0,
      _ranges: [{ maxWeight: null, mode: "fixed", value: 7000, delivery: 0, deliveryMode: "fixed" }] } },
];

const req = (details, extra = {}) => ({ id: "x", type: "SIMPLE", details: JSON.stringify(details), ...extra });

// ── Точный источник: сохранённая строка услуг ───────────────────
test("Строка услуг с calcKey unload — точное значение", () => {
  const r = { type: "REQUEST", details: { warehouseServices: [
    { calcKey: "transport", name: "Перевозка", total: 10000 },
    { calcKey: "unload", name: "Выгрузка, 3 мест", total: 3000 },
  ] } };
  assert.strictEqual(unloadFromServices(r), 3000);
  assert.deepStrictEqual(unloadOfRequest(r, ТАРИФЫ), { sum: 3000, exact: true, known: true });
});

test("Несколько строк выгрузки складываются", () => {
  const r = { details: { warehouseServices: [
    { calcKey: "unload", total: 1000 }, { calcKey: "unload", total: 2000 } ] } };
  assert.strictEqual(unloadFromServices(r), 3000);
});

test("Нет строки выгрузки — точного источника нет", () => {
  const r = { details: { warehouseServices: [{ calcKey: "transport", total: 10000 }] } };
  assert.strictEqual(unloadFromServices(r), null);
});

test("КЛЮЧЕВОЕ: по слову «выгрузка» в склеенном названии НЕ ловим", () => {
  // У старых юрлиц весь расчёт лежал одной строкой с полной расшифровкой.
  // Поиск по названию дал бы сумму ВСЕГО расчёта вместо выгрузки.
  const r = { details: { warehouseServices: [{
    name: "Доставка Новосибирск (0.36 м³ × 24 000 тг/м³) + доставка диапазона 200 тг + выгрузка 3 мест × 1 000 тг",
    qty: 1, price: 11840, total: 11840 }] } };
  assert.strictEqual(unloadFromServices(r), null, "поймали склеенную строку — это 11 840 вместо 3 000");
});

test("Пустой/битый details не роняет", () => {
  assert.strictEqual(unloadFromServices({}), null);
  assert.strictEqual(unloadFromServices({ details: "не json" }), null);
  assert.strictEqual(unloadFromServices(null), null);
});

// ── Поле накладной (частные сохраняют выгрузку при оформлении) ──
test("details.unloadSum — точное значение", () => {
  const r = req({ isSimple: true, route: { toCity: "Актау" }, totals: { seats: 3 }, unloadSum: 3000 });
  assert.strictEqual(unloadFromField(r), 3000);
  assert.deepStrictEqual(unloadOfRequest(r, ТАРИФЫ), { sum: 3000, exact: true, known: true });
});

test("Сохранённый НОЛЬ — это ответ «ставки нет», а не отсутствие данных", () => {
  const r = req({ isSimple: true, route: { toCity: "Актау" }, totals: { seats: 3 }, unloadSum: 0 });
  assert.strictEqual(unloadFromField(r), 0);
  assert.deepStrictEqual(unloadOfRequest(r, ТАРИФЫ), { sum: 0, exact: true, known: true });
});

test("Нет ключа unloadSum — поля нет, идём в пересчёт", () => {
  assert.strictEqual(unloadFromField(req({ isSimple: true, totals: {} })), null);
  assert.strictEqual(unloadFromField({}), null);
});

test("Пустая строка и мусор в unloadSum — поля нет", () => {
  assert.strictEqual(unloadFromField(req({ unloadSum: "" })), null);
  assert.strictEqual(unloadFromField(req({ unloadSum: "абв" })), null);
});

test("Сохранённое поле имеет приоритет над пересчётом по тарифу", () => {
  // Тариф дал бы 3000 (3 места × 1000), но в накладной записано 999 —
  // значит тариф на момент оформления был другим. Верим накладной.
  const r = req({ isSimple: true, route: { toCity: "Актау", fromCity: "Алматы" },
    totals: { seats: 3, weight: 24 }, unloadSum: 999 });
  const u = unloadOfRequest(r, ТАРИФЫ);
  assert.strictEqual(u.sum, 999, "пересчёт перебил сохранённое в накладной");
  assert.strictEqual(u.exact, true);
});

test("Поле накладной имеет приоритет и над таблицей услуг", () => {
  const r = { type: "REQUEST", details: { unloadSum: 111,
    warehouseServices: [{ calcKey: "unload", total: 222 }] } };
  assert.strictEqual(unloadOfRequest(r, ТАРИФЫ).sum, 111);
});

test("Партия из накладных с сохранённой выгрузкой — exact", () => {
  const a = req({ isSimple: true, unloadSum: 1000 });
  const b = req({ isSimple: true, unloadSum: 2000 });
  assert.deepStrictEqual(unloadOfRequests([a, b], ТАРИФЫ), { sum: 3000, exact: true, known: true });
});

// ── Пересчёт по тарифу ──────────────────────────────────────────
test("Частная без разбивки — пересчёт по тарифу, помечен как неточный", () => {
  const r = req({ isSimple: true, route: { toCity: "Актау", fromCity: "Алматы" }, totals: { seats: 3, weight: 24 } });
  assert.deepStrictEqual(unloadOfRequest(r, ТАРИФЫ), { sum: 3000, exact: false, known: true });
});

test("Мест нет — выгрузки нет, и это факт, а не пробел", () => {
  const r = req({ isSimple: true, route: { toCity: "Актау" }, totals: { seats: 0, weight: 24 } });
  assert.deepStrictEqual(unloadOfRequest(r, ТАРИФЫ), { sum: 0, exact: false, known: true });
});

test("Тариф без ставки выгрузки — ноль", () => {
  const r = { type: "REQUEST", details: JSON.stringify({
    route: { toCity: "Тараз", fromCity: "Алматы" }, totals: { seats: 5, weight: 10 } }) };
  assert.strictEqual(unloadOfRequest(r, ТАРИФЫ).sum, 0);
});

test("Тариф не найден — known=false (показать «—», а не 0)", () => {
  const r = req({ isSimple: true, route: { toCity: "Марс" }, totals: { seats: 3, weight: 10 } });
  const u = unloadOfRequest(r, ТАРИФЫ);
  assert.strictEqual(u.known, false, "ноль вместо «неизвестно» соврал бы, что выгрузки не было");
});

test("Города нет — known=false", () => {
  const r = req({ isSimple: true, route: {}, totals: { seats: 3 } });
  assert.strictEqual(unloadOfRequest(r, ТАРИФЫ).known, false);
});

test("Категория не путается: частный тариф не берётся для юрлица", () => {
  // Актау есть только в частных. Для юрлица тариф не найдётся.
  const legal = { type: "REQUEST", details: JSON.stringify({
    route: { toCity: "Актау", fromCity: "Алматы" }, totals: { seats: 3, weight: 24 } }) };
  assert.strictEqual(unloadOfRequest(legal, ТАРИФЫ).known, false);
});

test("Сохранённая строка имеет приоритет над пересчётом", () => {
  const r = { type: "SIMPLE", details: {
    isSimple: true, route: { toCity: "Актау", fromCity: "Алматы" }, totals: { seats: 3, weight: 24 },
    warehouseServices: [{ calcKey: "unload", total: 777 }] } };
  const u = unloadOfRequest(r, ТАРИФЫ);
  assert.strictEqual(u.sum, 777, "пересчёт перебил сохранённое значение");
  assert.strictEqual(u.exact, true);
});

// ── Сумма по партии ─────────────────────────────────────────────
test("Партия: суммируются все накладные", () => {
  const a = req({ isSimple: true, route: { toCity: "Актау", fromCity: "Алматы" }, totals: { seats: 3, weight: 24 } });
  const b = req({ isSimple: true, route: { toCity: "Актау", fromCity: "Алматы" }, totals: { seats: 1, weight: 10 } });
  assert.strictEqual(unloadOfRequests([a, b], ТАРИФЫ).sum, 4000);
});

test("Партия: одна восстановленная делает всю сумму неточной", () => {
  const exact = { details: { warehouseServices: [{ calcKey: "unload", total: 1000 }] } };
  const est = req({ isSimple: true, route: { toCity: "Актау", fromCity: "Алматы" }, totals: { seats: 1, weight: 10 } });
  const r = unloadOfRequests([exact, est], ТАРИФЫ);
  assert.strictEqual(r.sum, 2000);
  assert.strictEqual(r.exact, false, "смесь точного и восстановленного обязана считаться неточной");
});

test("Партия из точных строк — exact", () => {
  const a = { details: { warehouseServices: [{ calcKey: "unload", total: 1000 }] } };
  const b = { details: { warehouseServices: [{ calcKey: "unload", total: 500 }] } };
  assert.deepStrictEqual(unloadOfRequests([a, b], ТАРИФЫ), { sum: 1500, exact: true, known: true });
});

test("Пустая партия — known=false, показывать «—»", () => {
  assert.deepStrictEqual(unloadOfRequests([], ТАРИФЫ), { sum: 0, exact: true, known: false });
});

test("Накладная без тарифа не обнуляет остальные", () => {
  const ok = req({ isSimple: true, route: { toCity: "Актау", fromCity: "Алматы" }, totals: { seats: 2, weight: 10 } });
  const bad = req({ isSimple: true, route: { toCity: "Марс" }, totals: { seats: 9, weight: 10 } });
  const r = unloadOfRequests([ok, bad], ТАРИФЫ);
  assert.strictEqual(r.sum, 2000);
  assert.strictEqual(r.known, true);
  assert.strictEqual(r.exact, false);
});

test("null/undefined в списке пропускаются", () => {
  assert.strictEqual(unloadOfRequests([null, undefined], ТАРИФЫ).known, false);
});

test("isSimple: по типу и по признаку в details", () => {
  assert.strictEqual(isSimple({ type: "SIMPLE", details: "{}" }), true);
  assert.strictEqual(isSimple({ type: "REQUEST", details: { isSimple: true } }), true);
  assert.strictEqual(isSimple({ type: "REQUEST", details: {} }), false);
});

console.log(`\nИтого (unloadSum): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
