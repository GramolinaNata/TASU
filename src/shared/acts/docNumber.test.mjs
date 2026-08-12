// Тесты формата номера. Запуск: node src/shared/acts/docNumber.test.mjs
import assert from "node:assert";
import { formatDocNumber, normalizeDocNumber, docNumberVariants, isPlainNumber } from "./docNumber.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`✓ ${name}`); }
  catch (e) { failed++; console.log(`✗ ${name}\n   ${e.message}`); }
}

// ── Показ ───────────────────────────────────────────────────────
test("Голое число дополняется до шести знаков", () => {
  assert.strictEqual(formatDocNumber("1"), "000001");
  assert.strictEqual(formatDocNumber("2"), "000002");
  assert.strictEqual(formatDocNumber("42"), "000042");
  assert.strictEqual(formatDocNumber(42), "000042");
});
test("Уже дополненный номер не меняется", () => {
  assert.strictEqual(formatDocNumber("000042"), "000042");
});
test("Номер длиннее шести знаков НЕ обрезается", () => {
  // Обрезка превратила бы 1234567 в другой документ.
  assert.strictEqual(formatDocNumber("1234567"), "1234567");
  assert.strictEqual(formatDocNumber("999999"), "999999");
});
test("СТАРЫЕ ФОРМАТЫ не трогаем", () => {
  assert.strictEqual(formatDocNumber("А000001"), "А000001");   // кириллица
  assert.strictEqual(formatDocNumber("A000001"), "A000001");   // латиница
  assert.strictEqual(formatDocNumber("IPT000005"), "IPT000005");
  assert.strictEqual(formatDocNumber("A000002-копия-2"), "A000002-копия-2");
});
test("Пусто остаётся пустым, а не «000000»", () => {
  assert.strictEqual(formatDocNumber(""), "");
  assert.strictEqual(formatDocNumber(null), "");
  assert.strictEqual(formatDocNumber(undefined), "");
  assert.strictEqual(formatDocNumber("   "), "");
});
test("Пробелы по краям срезаются", () => {
  assert.strictEqual(formatDocNumber("  42  "), "000042");
});

// ── Поиск ───────────────────────────────────────────────────────
test("Ведущие нули снимаются для поиска", () => {
  assert.strictEqual(normalizeDocNumber("000042"), "42");
  assert.strictEqual(normalizeDocNumber("42"), "42");
  assert.strictEqual(normalizeDocNumber("000001"), "1");
});
test("Одни нули дают «0», а не пустоту", () => {
  assert.strictEqual(normalizeDocNumber("000000"), "0");
  assert.strictEqual(normalizeDocNumber("0"), "0");
});
test("Старые форматы для поиска не меняются", () => {
  assert.strictEqual(normalizeDocNumber("А000001"), "А000001");
  assert.strictEqual(normalizeDocNumber("IPT000005"), "IPT000005");
});

// ── Круговой обход ──────────────────────────────────────────────
test("КЛЮЧЕВОЕ: напечатанное находится поиском (перебор)", () => {
  // Печатаем дополненный номер, храним голый. Если это не сходится —
  // сканирование наклейки перестаёт находить накладную.
  for (let n = 1; n <= 200000; n = n < 100 ? n + 1 : n * 3) {
    const stored = String(n);
    const printed = formatDocNumber(stored);
    assert.strictEqual(normalizeDocNumber(printed), stored,
      `напечатали ${printed}, а ищем ${normalizeDocNumber(printed)} вместо ${stored}`);
  }
});

// ── Варианты для запроса ────────────────────────────────────────
test("Варианты: голый и дополненный", () => {
  assert.deepStrictEqual(docNumberVariants("42"), ["42", "000042"]);
  assert.deepStrictEqual(docNumberVariants("000042"), ["42", "000042"]);
});
test("Шестизначный номер даёт один вариант", () => {
  assert.deepStrictEqual(docNumberVariants("123456"), ["123456"]);
});
test("Старый формат — один вариант, как есть", () => {
  assert.deepStrictEqual(docNumberVariants("А000001"), ["А000001"]);
});
test("Пусто — вариантов нет", () => {
  assert.deepStrictEqual(docNumberVariants(""), []);
  assert.deepStrictEqual(docNumberVariants(null), []);
});

// ── Распознавание ───────────────────────────────────────────────
test("isPlainNumber отличает голое число от прочего", () => {
  assert.strictEqual(isPlainNumber("42"), true);
  assert.strictEqual(isPlainNumber("000042"), true);
  assert.strictEqual(isPlainNumber("А1"), false);
  assert.strictEqual(isPlainNumber("4 2"), false);
  assert.strictEqual(isPlainNumber("-42"), false);
  assert.strictEqual(isPlainNumber("4.2"), false);
  assert.strictEqual(isPlainNumber(""), false);
});

console.log(`\nИтого (docNumber): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
