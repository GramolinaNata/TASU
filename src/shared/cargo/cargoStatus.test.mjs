// Тесты движения груза. Запуск: npm test
// Фиксируют порядок цепочки, запрет перескока, права ролей и разбор QR —
// включая СТАРЫЙ формат, который уже напечатан на отгруженных наклейках.
import assert from "node:assert";
import {
  CARGO_CHAIN, CARGO_STATUS, CARGO_ROLES,
  isKnownCargoStatus, cargoLabel, nextCargoStatus, prevCargoStatus,
  canSetCargoStatus, parseScanPayload, buildScanUrl,
} from "./cargoStatus.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("✓ " + name); }
  catch (e) { failed++; console.error("✗ FAIL: " + name + "\n   " + e.message); }
}

// ---- цепочка ----

test("Цепочка из ТЗ: забрал → погрузил → представитель принял → выдал", () => {
  assert.deepStrictEqual(CARGO_CHAIN, ["picked_up", "loaded", "rep_received", "delivered"]);
});
test("Следующий шаг считается по порядку", () => {
  assert.strictEqual(nextCargoStatus(""), "picked_up");
  assert.strictEqual(nextCargoStatus("picked_up"), "loaded");
  assert.strictEqual(nextCargoStatus("loaded"), "rep_received");
  assert.strictEqual(nextCargoStatus("rep_received"), "delivered");
});
test("После выдачи шагов больше нет", () => {
  assert.strictEqual(nextCargoStatus("delivered"), null);
});
test("Мусор в текущем статусе трактуется как «не в пути»", () => {
  assert.strictEqual(nextCargoStatus("чтотопопало"), "picked_up");
  assert.strictEqual(nextCargoStatus(null), "picked_up");
});
test("Предыдущий шаг для отмены", () => {
  assert.strictEqual(prevCargoStatus("picked_up"), "");
  assert.strictEqual(prevCargoStatus("delivered"), "rep_received");
  assert.strictEqual(prevCargoStatus(""), null);
});
test("Известность статуса", () => {
  assert.ok(isKnownCargoStatus(""));
  assert.ok(isKnownCargoStatus("loaded"));
  assert.ok(!isKnownCargoStatus("Забрано"));   // старое значение из status
});
test("У каждого шага есть подпись", () => {
  for (const s of ["", ...CARGO_CHAIN]) assert.ok(cargoLabel(s).length > 0, `нет подписи для ${s}`);
});

// ---- переходы ----

test("Разрешён только следующий шаг", () => {
  assert.ok(canSetCargoStatus("", "picked_up", "COURIER").ok);
  assert.ok(canSetCargoStatus("picked_up", "loaded", "COURIER").ok);
});
test("ПЕРЕСКОК ЗАПРЕЩЁН: нельзя выдать груз, который не забирали", () => {
  const r = canSetCargoStatus("", "delivered", "COURIER");
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /перескочить/);
});
test("Нельзя прыгнуть через шаг вперёд", () => {
  assert.strictEqual(canSetCargoStatus("picked_up", "rep_received", "MANAGER").ok, false);
});
test("Повторный скан той же наклейки — не ошибка, а холостой успех", () => {
  const r = canSetCargoStatus("loaded", "loaded", "COURIER");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.noop, true);
});
test("Шаг назад: менеджеру и админу можно", () => {
  assert.ok(canSetCargoStatus("loaded", "picked_up", "MANAGER").ok);
  assert.ok(canSetCargoStatus("delivered", "rep_received", "ADMIN").ok);
});
test("Шаг назад: курьеру нельзя", () => {
  const r = canSetCargoStatus("loaded", "picked_up", "COURIER");
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /менеджер|администратор/);
});
test("Сброс в «не в пути» отдельным вызовом не делается", () => {
  assert.strictEqual(canSetCargoStatus("picked_up", "", "ADMIN").ok, false);
});
test("Неизвестный статус отвергается", () => {
  assert.strictEqual(canSetCargoStatus("", "Забрано", "ADMIN").ok, false);
  assert.strictEqual(canSetCargoStatus("", "чтоугодно", "ADMIN").ok, false);
});

// ---- роли ----

test("Этап 1: движение отмечают COURIER, MANAGER, ADMIN", () => {
  assert.deepStrictEqual(CARGO_ROLES, ["COURIER", "MANAGER", "ADMIN"]);
  for (const role of CARGO_ROLES) assert.ok(canSetCargoStatus("", "picked_up", role).ok, role);
});
test("Посторонние роли не двигают груз", () => {
  for (const role of ["ACCOUNTANT", "ACCOUNTANT2", "PRIVATE", "MANAGER2", undefined, ""]) {
    const r = canSetCargoStatus("", "picked_up", role);
    assert.strictEqual(r.ok, false, `роль ${role} прошла`);
  }
});

// ---- разбор QR ----

test("Новый QR-формат: ссылка /scan/<id>", () => {
  const r = parseScanPayload("https://tasu.kz/scan/2b7c1f9e-1111-4222-8333-444455556666");
  assert.deepStrictEqual(r, { kind: "id", value: "2b7c1f9e-1111-4222-8333-444455556666" });
});
test("Ссылка с портом и хвостом разбирается", () => {
  assert.strictEqual(parseScanPayload("http://localhost/scan/abc?x=1").value, "abc");
  assert.strictEqual(parseScanPayload("http://localhost:5173/scan/abc#z").value, "abc");
});
test("СТАРЫЙ формат наклеек: TASU-номер-город-получатель", () => {
  const r = parseScanPayload("TASU-А000007-Алматы-Иванов И.И.");
  assert.deepStrictEqual(r, { kind: "docNumber", value: "А000007" });
});
test("Старый формат: город с дефисом не ломает разбор", () => {
  assert.strictEqual(parseScanPayload("TASU-А000007-Усть-Каменогорск-Абд-Рахман").value, "А000007");
});
test("Старый формат: новая нумерация частных (голое число)", () => {
  assert.strictEqual(parseScanPayload("TASU-7-Алматы-Иванов").value, "7");
});
test("Голый uuid принимается", () => {
  const id = "2b7c1f9e-1111-4222-8333-444455556666";
  assert.deepStrictEqual(parseScanPayload(id), { kind: "id", value: id });
});
test("Мусор не распознаётся", () => {
  for (const x of ["", null, undefined, "просто текст", "https://tasu.kz/acts/123"]) {
    assert.strictEqual(parseScanPayload(x), null, `распознал мусор: ${x}`);
  }
});
test("Ссылка для наклейки собирается без двойного слэша", () => {
  assert.strictEqual(buildScanUrl("https://tasu.kz", "abc"), "https://tasu.kz/scan/abc");
  assert.strictEqual(buildScanUrl("https://tasu.kz/", "abc"), "https://tasu.kz/scan/abc");
});
test("Собранная ссылка разбирается обратно — круг замкнут", () => {
  const id = "2b7c1f9e-1111-4222-8333-444455556666";
  assert.strictEqual(parseScanPayload(buildScanUrl("https://tasu.kz", id)).value, id);
});

console.log(`\nИтого (cargoStatus): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
