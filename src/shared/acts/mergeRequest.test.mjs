// Тесты склейки накладной. Запуск: node src/shared/acts/mergeRequest.test.mjs
import assert from "node:assert";
import { mergeRequest, COLUMN_OWNED } from "./mergeRequest.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`✓ ${name}`); }
  catch (e) { failed++; console.log(`✗ ${name}\n   ${e.message}`); }
}

// ── Обычные поля: details главнее ───────────────────────────────
test("details перекрывает колонки для обычных полей", () => {
  const row = { id: "x", route: "Алматы -> Тараз", details: JSON.stringify({ route: { toCity: "Тараз" } }) };
  assert.deepStrictEqual(mergeRequest(row).route, { toCity: "Тараз" });
});

test("Поля, которых нет в details, берутся из колонок", () => {
  const row = { id: "x", companyId: "c1", details: JSON.stringify({ cargoText: "коробки" }) };
  const m = mergeRequest(row);
  assert.strictEqual(m.companyId, "c1");
  assert.strictEqual(m.cargoText, "коробки");
});

test("details объектом, а не строкой", () => {
  assert.strictEqual(mergeRequest({ id: "x", details: { cargoText: "мешки" } }).cargoText, "мешки");
});

test("Битый JSON не роняет — остаются колонки", () => {
  const m = mergeRequest({ id: "x", companyId: "c1", details: "{не json" });
  assert.strictEqual(m.companyId, "c1");
});

test("Пустой вход не роняет", () => {
  assert.deepStrictEqual(mergeRequest(null), {});
  assert.deepStrictEqual(mergeRequest(undefined), {});
});

// ── ГЛАВНОЕ: завершение читается из КОЛОНКИ ─────────────────────
test("ГЛАВНОЕ: details.isFullyCompleted НЕ перекрывает колонку", () => {
  // Ровно этот случай и оставлял накладную в «Завершённых» навсегда:
  // бухгалтер вернул её в активные (колонка false), а копия в details
  // продолжала говорить «завершена».
  const row = { id: "x", isFullyCompleted: false, details: JSON.stringify({ isFullyCompleted: true }) };
  assert.strictEqual(mergeRequest(row).isFullyCompleted, false,
    "накладная осталась бы завершённой вопреки бухгалтеру");
});

test("Обратное тоже: колонка true, в details false — верим колонке", () => {
  const row = { id: "x", isFullyCompleted: true, details: JSON.stringify({ isFullyCompleted: false }) };
  assert.strictEqual(mergeRequest(row).isFullyCompleted, true);
});

test("Мусор в details не делает накладную завершённой", () => {
  const row = { id: "x", isFullyCompleted: false, details: JSON.stringify({ isFullyCompleted: "да" }) };
  assert.strictEqual(mergeRequest(row).isFullyCompleted, false);
});

test("Оплата и статус тоже берутся из колонок", () => {
  const row = {
    id: "x", isPaid: false, status: "act",
    details: JSON.stringify({ isPaid: true, status: "done" }),
  };
  const m = mergeRequest(row);
  assert.strictEqual(m.isPaid, false, "оплата подменилась из details");
  assert.strictEqual(m.status, "act", "статус подменился из details");
});

test("fullyCompletedAt и reEditedAfterCompletion — из колонок", () => {
  const row = {
    id: "x", fullyCompletedAt: null, reEditedAfterCompletion: true,
    details: JSON.stringify({ fullyCompletedAt: "2026-01-01", reEditedAfterCompletion: false }),
  };
  const m = mergeRequest(row);
  assert.strictEqual(m.fullyCompletedAt, null);
  assert.strictEqual(m.reEditedAfterCompletion, true);
});

test("Все COLUMN_OWNED защищены — перебором", () => {
  for (const key of COLUMN_OWNED) {
    const row = { id: "x", [key]: "из-колонки", details: JSON.stringify({ [key]: "из-details" }) };
    assert.strictEqual(mergeRequest(row)[key], "из-колонки", `поле ${key} не защищено`);
  }
});

test("Колонки нет вовсе — значение из details остаётся", () => {
  // Частичная выборка: подставлять undefined поверх осмысленного нельзя.
  const row = { id: "x", details: JSON.stringify({ isFullyCompleted: true }) };
  assert.strictEqual(mergeRequest(row).isFullyCompleted, true);
});

test("Чистая запись без details не ломается", () => {
  const row = { id: "x", isFullyCompleted: true, status: "act" };
  const m = mergeRequest(row);
  assert.strictEqual(m.isFullyCompleted, true);
  assert.strictEqual(m.status, "act");
});

test("Исходный объект не мутируется", () => {
  const row = { id: "x", isFullyCompleted: false, details: JSON.stringify({ isFullyCompleted: true }) };
  mergeRequest(row);
  assert.strictEqual(row.isFullyCompleted, false);
});

console.log(`\nИтого (mergeRequest): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
