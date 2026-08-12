// Тесты единого состояния накладной. Запуск: npm test
// Фиксируют правило взаимоисключения разделов и разбор комбинаций-ловушек,
// из-за которых накладная попадала в два списка сразу либо пропадала отовсюду.
import assert from "node:assert";
import {
  SECTION, getActSection, deriveSection, sectionPatch, sectionPath, isKnownSection,
  sectionAfterAccountant,
} from "./section.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("✓ " + name); }
  catch (e) { failed++; console.error("✗ FAIL: " + name + "\n   " + e.message); }
}

// ---- базовые состояния ----

test("Обычная заявка → act", () => {
  assert.strictEqual(deriveSection({ type: "REQUEST" }), SECTION.ACT);
});
test("Пустой объект не роняет — act", () => {
  assert.strictEqual(deriveSection({}), SECTION.ACT);
  assert.strictEqual(deriveSection(null), SECTION.ACT);
});
test("ТТН по docType → ttn", () => {
  assert.strictEqual(deriveSection({ type: "REQUEST", docType: "ttn" }), SECTION.TTN);
});
test("ТТН по type (старые записи без docType) → ttn", () => {
  assert.strictEqual(deriveSection({ type: "ttn" }), SECTION.TTN);
});
test("СМР по docType → smr", () => {
  assert.strictEqual(deriveSection({ type: "REQUEST", docType: "smr" }), SECTION.SMR);
});
test("Склад → warehouse", () => {
  assert.strictEqual(deriveSection({ type: "REQUEST", isWarehouse: true }), SECTION.WAREHOUSE);
});
test("Отправлено бухгалтеру → accountant", () => {
  assert.strictEqual(deriveSection({ type: "REQUEST", readyForAccountant: true }), SECTION.ACCOUNTANT);
});
test("Отложено → deferred", () => {
  assert.strictEqual(deriveSection({ type: "REQUEST", isDeferredForAccountant: true }), SECTION.DEFERRED);
});
test("Частные → simple", () => {
  assert.strictEqual(deriveSection({ type: "SIMPLE" }), SECTION.SIMPLE);
  assert.strictEqual(deriveSection({ type: "REQUEST", isSimple: true }), SECTION.SIMPLE);
});

// ---- комбинации-ловушки: ровно из-за них и была правка ----

test("Склад + ТТН → только warehouse (был дубль склад/ТТН)", () => {
  assert.strictEqual(
    deriveSection({ type: "ttn", docType: "ttn", isWarehouse: true }),
    SECTION.WAREHOUSE
  );
});
test("Склад + СМР → только warehouse (номер 18 у заказчика)", () => {
  assert.strictEqual(
    deriveSection({ type: "smr", docType: "smr", isWarehouse: true }),
    SECTION.WAREHOUSE
  );
});
test("ready + deferred → deferred (раньше пропадала отовсюду)", () => {
  assert.strictEqual(
    deriveSection({ readyForAccountant: true, isDeferredForAccountant: true }),
    SECTION.DEFERRED
  );
});
test("ready + склад → accountant (у бухгалтера важнее раздела менеджера)", () => {
  assert.strictEqual(
    deriveSection({ isWarehouse: true, readyForAccountant: true }),
    SECTION.ACCOUNTANT
  );
});
test("Частные бьют всё остальное", () => {
  assert.strictEqual(
    deriveSection({ type: "SIMPLE", isWarehouse: true, readyForAccountant: true }),
    SECTION.SIMPLE
  );
});
test("Разом все флаги — deferred, ровно один раздел", () => {
  const s = deriveSection({
    type: "ttn", docType: "smr", isWarehouse: true,
    readyForAccountant: true, isDeferredForAccountant: true,
  });
  assert.strictEqual(s, SECTION.DEFERRED);
  assert.ok(isKnownSection(s));
});

// ---- details строкой и объектом ----

test("details объектом разбирается", () => {
  assert.strictEqual(
    deriveSection({ type: "REQUEST", details: { isWarehouse: true } }),
    SECTION.WAREHOUSE
  );
});
test("details JSON-строкой разбирается", () => {
  assert.strictEqual(
    deriveSection({ type: "REQUEST", details: JSON.stringify({ docType: "smr" }) }),
    SECTION.SMR
  );
});
test("Битая строка details не роняет", () => {
  assert.strictEqual(deriveSection({ type: "REQUEST", details: "{не json" }), SECTION.ACT);
});

// ---- записанное поле section приоритетнее вывода из флагов ----

test("getActSection берёт записанный section", () => {
  assert.strictEqual(
    getActSection({ section: SECTION.WAREHOUSE, type: "ttn", docType: "ttn" }),
    SECTION.WAREHOUSE
  );
});
test("getActSection падает на вывод, если section не записан", () => {
  assert.strictEqual(getActSection({ type: "ttn", docType: "ttn" }), SECTION.TTN);
});
test("Мусор в section игнорируется, работает вывод", () => {
  assert.strictEqual(getActSection({ section: "чтотопопало", isWarehouse: true }), SECTION.WAREHOUSE);
  assert.strictEqual(getActSection({ section: 42, docType: "smr" }), SECTION.SMR);
});
test("section из details-строки читается", () => {
  assert.strictEqual(
    getActSection({ details: JSON.stringify({ section: SECTION.DEFERRED }) }),
    SECTION.DEFERRED
  );
});

// ---- патч перехода ----

test("sectionPatch на склад: гасит docType, ставит признак склада", () => {
  const p = sectionPatch(SECTION.WAREHOUSE);
  assert.strictEqual(p.section, SECTION.WAREHOUSE);
  assert.strictEqual(p.isWarehouse, true);
  assert.strictEqual(p.docType, null);
  assert.strictEqual(p.type, "REQUEST");
  assert.strictEqual(p.readyForAccountant, false);
  assert.strictEqual(p.isDeferredForAccountant, false);
});
test("sectionPatch на ТТН гасит склад — не остаётся в двух разделах", () => {
  const p = sectionPatch(SECTION.TTN);
  assert.strictEqual(p.isWarehouse, false);
  assert.strictEqual(p.docType, "ttn");
  assert.strictEqual(p.type, "ttn");
});
test("sectionPatch на Заявки гасит и docType, и склад (отмена формирования)", () => {
  const p = sectionPatch(SECTION.ACT);
  assert.strictEqual(p.type, "REQUEST");
  assert.strictEqual(p.docType, null);
  assert.strictEqual(p.isWarehouse, false);
  assert.strictEqual(p.readyForAccountant, false);
  assert.strictEqual(p.isDeferredForAccountant, false);
});
test("Транзитные состояния НЕ трогают тип документа", () => {
  for (const s of [SECTION.ACCOUNTANT, SECTION.DEFERRED]) {
    const p = sectionPatch(s);
    assert.ok(!("isWarehouse" in p), `${s} затирает isWarehouse`);
    assert.ok(!("docType" in p), `${s} затирает docType`);
    assert.ok(!("type" in p), `${s} затирает type`);
  }
});
test("Склад → бухгалтер → возврат приводит обратно на склад, а не в Заявки", () => {
  const act = { type: "REQUEST", isWarehouse: true, docType: null };
  const sent = { ...act, ...sectionPatch(SECTION.ACCOUNTANT) };
  assert.strictEqual(deriveSection(sent), SECTION.ACCOUNTANT);
  assert.strictEqual(sectionAfterAccountant(sent), SECTION.WAREHOUSE);
});
test("СМР → отложено → возврат приводит обратно в СМР", () => {
  const act = { type: "smr", docType: "smr" };
  const def = { ...act, ...sectionPatch(SECTION.DEFERRED) };
  assert.strictEqual(deriveSection(def), SECTION.DEFERRED);
  assert.strictEqual(sectionAfterAccountant(def), SECTION.SMR);
});
test("Дубль склад+СМР лечится патчем: после перехода на склад СМР не остаётся", () => {
  const дубль = { type: "smr", docType: "smr", isWarehouse: true };
  const fixed = { ...дубль, ...sectionPatch(SECTION.WAREHOUSE) };
  assert.strictEqual(deriveSection(fixed), SECTION.WAREHOUSE);
  assert.strictEqual(fixed.docType, null);
  assert.strictEqual(fixed.type, "REQUEST");
});
test("sectionPatch согласован с deriveSection на разделах менеджера", () => {
  for (const s of [SECTION.ACT, SECTION.TTN, SECTION.SMR, SECTION.WAREHOUSE]) {
    assert.strictEqual(deriveSection({ ...sectionPatch(s), section: undefined }), s, `не сходится для ${s}`);
  }
});
test("sectionPatch отвергает неизвестное состояние и частных", () => {
  assert.throws(() => sectionPatch("склад"), /Неизвестное состояние/);
  assert.throws(() => sectionPatch(SECTION.SIMPLE), /Частные/);
});

// ---- маршруты ----

test("sectionPath ведёт в раздел, где накладная действительно окажется", () => {
  assert.strictEqual(sectionPath(SECTION.WAREHOUSE), "/warehouse");
  assert.strictEqual(sectionPath(SECTION.TTN, "abc"), "/requests/abc");
  assert.strictEqual(sectionPath(SECTION.SMR, "x1"), "/smr/x1");
  assert.strictEqual(sectionPath(SECTION.ACT), "/acts");
  assert.strictEqual(sectionPath(SECTION.DEFERRED), "/deferred");
  assert.strictEqual(sectionPath(SECTION.ACCOUNTANT), "/sent");
});
test("sectionPath на мусоре не роняет — /acts", () => {
  assert.strictEqual(sectionPath("неттакого"), "/acts");
});

// ── РЕГРЕСС: объект С КЛЮЧОМ details (так его отдают списки) ─────
// Списки строят элемент как { ...request, ...details } — ключ details в нём
// ОСТАЁТСЯ. Раньше все тесты кормили уже плоские объекты, поэтому двойной
// flatten не ловился: deriveSection флаттенил повторно и возвращал из details
// флаги, погашенные вызывающим кодом. Кнопка «Вернуть в работу» не работала
// на 23 боевых накладных. Эти тесты кормят именно такой объект.

// Как элемент списка: колонки + склеенные details + сам ключ details.
const listItem = (details, columns = {}) => ({
  id: "x",
  type: columns.type ?? "REQUEST",
  status: "act",
  ...columns,
  ...details,
  details: JSON.stringify(details),   // ← ключ остаётся, как в реальном коде
});

test("РЕГРЕСС: возврат от бухгалтера с ключом details ведёт в ТТН, а не обратно", () => {
  const act = listItem({ docType: "ttn", readyForAccountant: true, section: SECTION.ACCOUNTANT }, { type: "ttn" });
  assert.strictEqual(getActSection(act), SECTION.ACCOUNTANT, "исходное состояние");
  assert.strictEqual(sectionAfterAccountant(act), SECTION.TTN,
    "вернулось в accountant — details подмешался повторно");
});

test("РЕГРЕСС: возврат из отложенных с ключом details ведёт в СМР", () => {
  const act = listItem({ docType: "smr", isDeferredForAccountant: true, section: SECTION.DEFERRED }, { type: "smr" });
  assert.strictEqual(getActSection(act), SECTION.DEFERRED);
  assert.strictEqual(sectionAfterAccountant(act), SECTION.SMR);
});

test("РЕГРЕСС: складская накладная возвращается на склад, а не в заявки", () => {
  const act = listItem({ isWarehouse: true, readyForAccountant: true, section: SECTION.ACCOUNTANT });
  assert.strictEqual(sectionAfterAccountant(act), SECTION.WAREHOUSE);
});

test("РЕГРЕСС: заявка без документа возвращается в заявки", () => {
  const act = listItem({ readyForAccountant: true, section: SECTION.ACCOUNTANT });
  assert.strictEqual(sectionAfterAccountant(act), SECTION.ACT);
});

test("РЕГРЕСС: patch после возврата реально снимает флаг бухгалтера", () => {
  // Именно это и не срабатывало: patch писал readyForAccountant: true обратно.
  const act = listItem({ docType: "ttn", readyForAccountant: true, section: SECTION.ACCOUNTANT }, { type: "ttn" });
  const patch = sectionPatch(sectionAfterAccountant(act));
  assert.strictEqual(patch.section, SECTION.TTN);
  assert.strictEqual(patch.readyForAccountant, false, "флаг бухгалтера не снят — накладная застрянет");
  assert.strictEqual(patch.isDeferredForAccountant, false);
});

test("details ОБЪЕКТОМ (не строкой) — то же поведение", () => {
  const d = { docType: "ttn", readyForAccountant: true, section: SECTION.ACCOUNTANT };
  const act = { id: "x", type: "ttn", ...d, details: d };
  assert.strictEqual(sectionAfterAccountant(act), SECTION.TTN);
});

test("Записанный section в details не мешает возврату", () => {
  // Миграция проставила details.section. Он не должен переживать возврат.
  const act = listItem({ docType: "ttn", readyForAccountant: true, section: SECTION.ACCOUNTANT }, { type: "ttn" });
  assert.notStrictEqual(sectionAfterAccountant(act), SECTION.ACCOUNTANT);
});

test("ИДЕМПОТЕНТНОСТЬ: повторный вывод не меняет результат", () => {
  const act = listItem({ docType: "smr", readyForAccountant: true, section: SECTION.ACCOUNTANT }, { type: "smr" });
  const once = sectionAfterAccountant(act);
  assert.strictEqual(sectionAfterAccountant({ ...act, section: once }), once,
    "второй проход дал другой ответ — flatten не идемпотентен");
});

test("getActSection с ключом details читает записанное состояние", () => {
  const act = listItem({ docType: "ttn", section: SECTION.WAREHOUSE }, { type: "ttn" });
  assert.strictEqual(getActSection(act), SECTION.WAREHOUSE, "записанное состояние приоритетнее флагов");
});

test("Битый JSON в details не роняет и не меняет вывод по колонкам", () => {
  const act = { id: "x", type: "ttn", docType: "ttn", details: "{не json" };
  assert.strictEqual(getActSection(act), SECTION.TTN);
});

console.log(`\nИтого (section): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
