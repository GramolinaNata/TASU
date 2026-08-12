// Тесты правила завершения. Запуск: node src/shared/acts/completion.test.mjs
import assert from "node:assert";
import { canComplete, canUncomplete, splitCompletable, statusLabel, PROCESSED_STATUS } from "./completion.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`✓ ${name}`); }
  catch (e) { failed++; console.log(`✗ ${name}\n   ${e.message}`); }
}

const act = (status, extra = {}) => ({ id: "x", docNumber: "42", status, ...extra });

// ── Главное правило ─────────────────────────────────────────────
test("Из «Обработанных» завершить можно", () => {
  assert.strictEqual(canComplete(act("done")).ok, true);
});

test("ГЛАВНОЕ: из «В стоке» завершить НЕЛЬЗЯ", () => {
  const r = canComplete(act("act"));
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /В стоке/);
  assert.match(r.reason, /Обработанные/, "в отказе не сказано, что делать дальше");
});

test("ГЛАВНОЕ: из «Подано» завершить НЕЛЬЗЯ", () => {
  const r = canComplete(act("sent"));
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /Подано/);
});

test("Из «Отложенных» завершить нельзя", () => {
  assert.strictEqual(canComplete(act("deferred")).ok, false);
});

test("Аннулированную завершить нельзя, и причина именно про аннулирование", () => {
  const r = canComplete(act("canceled"));
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /аннулирована/);
});

test("Уже завершённую повторно не завершаем", () => {
  const r = canComplete(act("done", { isPaid: true }));
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /уже завершена/);
});

test("Пустой статус — нельзя, а не «можно по умолчанию»", () => {
  assert.strictEqual(canComplete(act("")).ok, false);
  assert.strictEqual(canComplete(act(undefined)).ok, false);
  assert.strictEqual(canComplete({}).ok, false);
});

test("Нет накладной — не роняем", () => {
  assert.strictEqual(canComplete(null).ok, false);
  assert.strictEqual(canComplete(undefined).ok, false);
});

test("Статус с пробелами по краям распознаётся", () => {
  assert.strictEqual(canComplete(act("  done  ")).ok, true);
});

test("Неизвестный статус завершать нельзя", () => {
  assert.strictEqual(canComplete(act("что-то новое")).ok, false);
});

// ── Возврат из «Завершённых» ────────────────────────────────────
test("Снять отметку об оплате можно — это исправление ошибки", () => {
  assert.strictEqual(canUncomplete(act("done", { isPaid: true })).ok, true);
});

test("Снятие не требует статуса «Обработанные»", () => {
  // Иначе неверно завершённую накладную нечем было бы вернуть.
  assert.strictEqual(canUncomplete(act("act", { isPaid: true })).ok, true);
});

test("Незавершённую снимать нечего", () => {
  assert.strictEqual(canUncomplete(act("done")).ok, false);
});

// ── Массовая отметка ────────────────────────────────────────────
test("Выборка делится на разрешённые и заблокированные", () => {
  const { allowed, blocked } = splitCompletable([
    act("done", { docNumber: "1" }),
    act("act", { docNumber: "2" }),
    act("done", { docNumber: "3" }),
    act("canceled", { docNumber: "4" }),
  ]);
  assert.deepStrictEqual(allowed.map(a => a.docNumber), ["1", "3"]);
  assert.deepStrictEqual(blocked.map(b => b.act.docNumber), ["2", "4"]);
});

test("У каждой заблокированной есть своя причина", () => {
  const { blocked } = splitCompletable([act("act"), act("canceled")]);
  assert.strictEqual(blocked.length, 2);
  for (const b of blocked) assert.ok(b.reason && b.reason.length > 3, "причина пустая");
  assert.notStrictEqual(blocked[0].reason, blocked[1].reason, "причины должны различаться");
});

test("Пустой список — пустые обе части", () => {
  assert.deepStrictEqual(splitCompletable([]), { allowed: [], blocked: [] });
  assert.deepStrictEqual(splitCompletable(null), { allowed: [], blocked: [] });
});

test("Все заблокированы — разрешённых ноль", () => {
  const { allowed, blocked } = splitCompletable([act("act"), act("sent")]);
  assert.strictEqual(allowed.length, 0);
  assert.strictEqual(blocked.length, 2);
});

// ── Названия статусов ───────────────────────────────────────────
test("Статусы называются по-человечески", () => {
  assert.strictEqual(statusLabel("act"), "В стоке");
  assert.strictEqual(statusLabel("sent"), "Подано");
  assert.strictEqual(statusLabel("done"), "Обработанные");
  assert.strictEqual(statusLabel("canceled"), "Аннулированные");
  assert.strictEqual(statusLabel(""), "без статуса");
});

test("Константа статуса не разъехалась", () => {
  assert.strictEqual(PROCESSED_STATUS, "done");
});

console.log(`\nИтого (completion): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
