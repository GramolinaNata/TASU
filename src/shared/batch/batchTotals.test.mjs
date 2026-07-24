// Тесты агрегации накладных партии (места, вес, выручка) с исключением аннулированных.
// Запуск: node src/shared/batch/batchTotals.test.mjs  (или npm test).
// Фикстуры повторяют структуру реальной партии EП000001: 3 накладных, одна canceled.
import assert from "node:assert";
import {
  activeRequestIds,
  batchTotalsExcludingCanceled,
  buildActiveTotalsMap,
  requestTotals,
  requestIncome,
} from "./batchTotals.js";

// ── Фикстуры накладных (как из api.requests.list()) ─────────────
const REQ = {
  a: { id: "a", status: "sent",     details: JSON.stringify({ totals: { seats: 34, weight: 100 }, totalSum: 5000 }) },
  b: { id: "b", status: "done",     details: JSON.stringify({ totals: { seats: 4,  weight: 20  }, totalSum: 800 }) },
  c: { id: "c", status: "canceled", details: JSON.stringify({ totals: { seats: 3,  weight: 50  }, totalSum: 999 }) },
  d: { id: "d", status: "act",      details: { totals: { seats: 2, weight: 10 }, totalSum: 300 } }, // details объектом
};
const getReq = (id) => REQ[id];

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("✓ " + name); }
  catch (e) { failed++; console.error("✗ FAIL: " + name + "\n   " + e.message); }
}

// ── Хелперы одной накладной ─────────────────────────────────────
test("requestTotals парсит строковый и объектный details", () => {
  assert.deepStrictEqual(requestTotals(REQ.a), { seats: 34, weight: 100 });
  assert.deepStrictEqual(requestTotals(REQ.d), { seats: 2, weight: 10 });
});
test("requestIncome берёт totalSum (поле и из details)", () => {
  assert.strictEqual(requestIncome(REQ.a), 5000);
  assert.strictEqual(requestIncome({ details: JSON.stringify({ totalSum: 700 }) }), 700);
});

// ── Исключение аннулированных ───────────────────────────────────
test("activeRequestIds выкидывает canceled, ненайденную оставляет", () => {
  assert.deepStrictEqual(activeRequestIds(["a", "b", "c"], getReq), ["a", "b"]);
  assert.deepStrictEqual(activeRequestIds(["a", "x"], getReq), ["a", "x"]); // x не найдена → fallback
});

test("Отчёт: МЕСТА партии без аннулированной (34+4+[3 canceled] = 38)", () => {
  const { seats } = batchTotalsExcludingCanceled(["a", "b", "c"], getReq);
  assert.strictEqual(seats, 38);
});

test("Отчёт: ВЫРУЧКА партии без аннулированной (5000+800+[999 canceled] = 5800)", () => {
  const { income } = batchTotalsExcludingCanceled(["a", "b", "c"], getReq);
  assert.strictEqual(income, 5800);
});

test("Батч: ВЕС партии без аннулированной (100+20+[50 canceled] = 120)", () => {
  const { weight } = batchTotalsExcludingCanceled(["a", "b", "c"], getReq);
  assert.strictEqual(weight, 120);
});

test("count = число активных накладных (2 из 3)", () => {
  assert.strictEqual(batchTotalsExcludingCanceled(["a", "b", "c"], getReq).count, 2);
});

test("Ненайденная накладная не ломает подсчёт (вклад 0)", () => {
  const r = batchTotalsExcludingCanceled(["a", "x"], getReq);
  assert.deepStrictEqual(r, { seats: 34, weight: 100, income: 5000, count: 1 });
});

// ── Карта итогов для списка партий (BatchesPage) ────────────────
test("buildActiveTotalsMap исключает canceled из карты", () => {
  const map = buildActiveTotalsMap([REQ.a, REQ.b, REQ.c, REQ.d]);
  assert.ok(map.a && map.b && map.d, "активные должны быть в карте");
  assert.strictEqual(map.c, undefined, "аннулированная не должна попадать в карту");
  assert.deepStrictEqual(map.a, { seats: 34, weight: 100 });
});

test("Партия целиком из аннулированных → нули", () => {
  const r = batchTotalsExcludingCanceled(["c"], getReq);
  assert.deepStrictEqual(r, { seats: 0, weight: 0, income: 0, count: 0 });
});

console.log(`\nИтого (batchTotals): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
