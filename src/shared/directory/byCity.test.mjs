// Тесты привязки справочников к городам. Запуск: npm test
// Фиксируют три случая выбора (один / несколько / никого) и обратную
// совместимость со старым одиночным полем city.
import assert from "node:assert";
import { entityCities, servesCity, filterByCity, cityHint } from "./byCity.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("✓ " + name); }
  catch (e) { failed++; console.error("✗ FAIL: " + name + "\n   " + e.message); }
}

// ── Фикстуры ────────────────────────────────────────────────────
const ЕРЖАН   = { id: "c1", name: "ИП Ержан",      cities: JSON.stringify(["Актау", "Жанаозен"]) };
const КАЗТРАНС= { id: "c2", name: "ТОО КазТранс",  cities: JSON.stringify(["Актау"]) };
const СЕРИК   = { id: "c3", name: "ИП Серик",      cities: JSON.stringify(["Атырау"]) };
const СТАРЫЙ  = { id: "c4", name: "ИП Старый",     city: "Астана" };            // до появления cities
const ПУСТОЙ  = { id: "c5", name: "ИП Без города" };                            // города не заданы
const ALL = [ЕРЖАН, КАЗТРАНС, СЕРИК, СТАРЫЙ, ПУСТОЙ];

// ── 1. Чтение городов: новое поле, легаси, форматы ──────────────
test("entityCities читает JSON-массив", () => {
  assert.deepStrictEqual(entityCities(ЕРЖАН), ["Актау", "Жанаозен"]);
});
test("entityCities: fallback на старое одиночное city", () => {
  assert.deepStrictEqual(entityCities(СТАРЫЙ), ["Астана"]);
});
test("entityCities: строка через запятую (легаси-ввод)", () => {
  assert.deepStrictEqual(entityCities({ cities: "Актау, Атырау ,Астана" }), ["Актау", "Атырау", "Астана"]);
});
test("entityCities: массив как есть, мусор и пустые отсекаются", () => {
  assert.deepStrictEqual(entityCities({ cities: ["Актау", "", "  ", null, "Атырау"] }), ["Актау", "Атырау"]);
});
test("entityCities: нет ни cities, ни city → пусто", () => {
  assert.deepStrictEqual(entityCities(ПУСТОЙ), []);
  assert.deepStrictEqual(entityCities(null), []);
});
test("cities приоритетнее устаревшего city", () => {
  const x = { city: "Астана", cities: JSON.stringify(["Актау"]) };
  assert.deepStrictEqual(entityCities(x), ["Актау"]);
});

// ── 2. Нормализация города ──────────────────────────────────────
test("servesCity: регистр и пробелы игнорируются", () => {
  assert.ok(servesCity(ЕРЖАН, "актау"));
  assert.ok(servesCity(ЕРЖАН, "  АКТАУ  "));
});
test("servesCity: служебные суффиксы тарифов снимаются", () => {
  assert.ok(servesCity(ЕРЖАН, "Актау__CARRIERS"));
  assert.ok(servesCity(ЕРЖАН, "Актау__PRIVATE"));
  assert.ok(servesCity({ cities: JSON.stringify(["Актау__CARRIERS"]) }, "Актау"));
});
test("servesCity: чужой город и пустой запрос → false", () => {
  assert.ok(!servesCity(ЕРЖАН, "Астана"));
  assert.ok(!servesCity(ЕРЖАН, ""));
});

// ── 3. Три случая селекта ───────────────────────────────────────
test("СЛУЧАЙ «несколько»: список сужен, предвыбора нет", () => {
  const r = filterByCity(ALL, "Актау");
  assert.strictEqual(r.matched, 2);
  assert.strictEqual(r.isFiltered, true);
  assert.strictEqual(r.autoPick, null, "при нескольких кандидатах автоподстановки быть не должно");
  assert.deepStrictEqual(r.list.map(x => x.name), ["ИП Ержан", "ТОО КазТранс"]);
});
test("СЛУЧАЙ «один»: подставляется сразу", () => {
  const r = filterByCity(ALL, "Атырау");
  assert.strictEqual(r.matched, 1);
  assert.strictEqual(r.isFiltered, true);
  assert.ok(r.autoPick && r.autoPick.id === "c3", "должен подставиться ИП Серик");
});
test("СЛУЧАЙ «никого»: fallback на весь справочник, флаг снят", () => {
  const r = filterByCity(ALL, "Шымкент");
  assert.strictEqual(r.matched, 0);
  assert.strictEqual(r.isFiltered, false);
  assert.strictEqual(r.autoPick, null);
  assert.strictEqual(r.list.length, ALL.length, "работу блокировать нельзя — показываем всех");
});
test("Легаси-запись участвует в фильтре наравне (Астана → ИП Старый)", () => {
  const r = filterByCity(ALL, "Астана");
  assert.strictEqual(r.matched, 1);
  assert.ok(r.autoPick && r.autoPick.id === "c4");
});
test("Один перевозчик обслуживает несколько городов", () => {
  assert.strictEqual(filterByCity(ALL, "Жанаозен").matched, 1);
  assert.strictEqual(filterByCity(ALL, "Актау").matched, 2);
});

// ── 4. Граничные ────────────────────────────────────────────────
test("Город не выбран → весь список, без фильтра", () => {
  const r = filterByCity(ALL, "");
  assert.strictEqual(r.isFiltered, false);
  assert.strictEqual(r.list.length, ALL.length);
});
test("Пустой справочник не ломает выбор", () => {
  const r = filterByCity([], "Актау");
  assert.deepStrictEqual(r.list, []);
  assert.strictEqual(r.matched, 0);
  assert.strictEqual(r.isFiltered, false);
});
test("Не-массив на входе не роняет хелпер", () => {
  assert.deepStrictEqual(filterByCity(null, "Актау").list, []);
  assert.deepStrictEqual(filterByCity(undefined, "").list, []);
});

// ── 5. Подписи под селектом ─────────────────────────────────────
test("cityHint: три формулировки под три случая", () => {
  assert.match(cityHint(filterByCity(ALL, "Атырау"), "Атырау"), /Подставлен по городу/);
  assert.match(cityHint(filterByCity(ALL, "Актау"), "Актау"), /закреплённые за городом «Актау» \(2\)/);
  assert.match(cityHint(filterByCity(ALL, "Шымкент"), "Шымкент", "представители"), /никто не закреплён.*представители/);
  assert.strictEqual(cityHint(filterByCity(ALL, ""), ""), "");
});

console.log(`\nИтого (byCity): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
