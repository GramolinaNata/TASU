// Тесты доп. суммы за нестандартный груз. Запуск: node src/shared/acts/extraSum.test.mjs
import assert from "node:assert";
import { readExtra, extraPatch, totalWithExtra, tariffPartOf } from "./extraSum.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`✓ ${name}`); }
  catch (e) { failed++; console.log(`✗ ${name}\n   ${e.message}`); }
}

// ── Чтение сохранённого ─────────────────────────────────────────
test("Пустые details — доплаты нет", () => {
  assert.deepStrictEqual(readExtra({}), { on: false, sum: 0, note: "" });
});
test("Нет источника вообще — не падаем", () => {
  assert.deepStrictEqual(readExtra(null), { on: false, sum: 0, note: "" });
  assert.deepStrictEqual(readExtra(undefined), { on: false, sum: 0, note: "" });
});
test("Доплата есть — галочка выводится из суммы", () => {
  assert.deepStrictEqual(readExtra({ extraSum: 3000, extraSumNote: "полкуба" }),
    { on: true, sum: 3000, note: "полкуба" });
});
test("Сумма строкой (пришла из поля ввода)", () => {
  assert.strictEqual(readExtra({ extraSum: "2500" }).sum, 2500);
});
test("Ноль — доплаты нет", () => {
  assert.strictEqual(readExtra({ extraSum: 0, extraSumNote: "неважно" }).on, false);
});
test("Отрицательная сумма — это не скидка, а ноль", () => {
  assert.deepStrictEqual(readExtra({ extraSum: -500 }), { on: false, sum: 0, note: "" });
});
test("Мусор в поле — ноль, а не NaN", () => {
  assert.strictEqual(readExtra({ extraSum: "абв" }).sum, 0);
});
test("Причина без суммы не показывается", () => {
  assert.strictEqual(readExtra({ extraSum: "", extraSumNote: "полкуба" }).note, "");
});
test("Причина обрезается по краям", () => {
  assert.strictEqual(readExtra({ extraSum: 100, extraSumNote: "  полкуба  " }).note, "полкуба");
});

// ── Сохранение ──────────────────────────────────────────────────
test("Галочка снята — пишем ноль, а не пропускаем ключ", () => {
  // details на бэке СЛИВАЮТСЯ: пропущенный ключ = «оставить как было»,
  // и снятая галочка не сохранилась бы.
  const p = extraPatch({ on: false, sum: 3000, note: "полкуба" });
  assert.deepStrictEqual(p, { extraSum: 0, extraSumNote: "" });
  assert.ok("extraSum" in p, "ключ extraSum обязан присутствовать");
  assert.ok("extraSumNote" in p, "ключ extraSumNote обязан присутствовать");
});
test("Галочка стоит, сумма пустая — сохраняем ноль", () => {
  assert.deepStrictEqual(extraPatch({ on: true, sum: "", note: "полкуба" }),
    { extraSum: 0, extraSumNote: "" });
});
test("Галочка стоит с суммой — сохраняем и сумму, и причину", () => {
  assert.deepStrictEqual(extraPatch({ on: true, sum: "3000", note: "полкуба" }),
    { extraSum: 3000, extraSumNote: "полкуба" });
});
test("Причина необязательна", () => {
  assert.deepStrictEqual(extraPatch({ on: true, sum: 3000 }),
    { extraSum: 3000, extraSumNote: "" });
});
test("Сохранили → прочитали: то же самое (круговой обход)", () => {
  const src = { on: true, sum: "1234.5", note: "нестандарт" };
  assert.deepStrictEqual(readExtra(extraPatch(src)), { on: true, sum: 1234.5, note: "нестандарт" });
});
test("Пустой вызов не роняет", () => {
  assert.deepStrictEqual(extraPatch(), { extraSum: 0, extraSumNote: "" });
  assert.deepStrictEqual(extraPatch(undefined), { extraSum: 0, extraSumNote: "" });
});

// ── Итог ────────────────────────────────────────────────────────
test("Итог = тариф + доплата", () => {
  assert.strictEqual(totalWithExtra(12400, { on: true, sum: 3000 }), 15400);
});
test("Доплаты нет — итог равен тарифу", () => {
  assert.strictEqual(totalWithExtra(12400, { on: false, sum: 3000 }), 12400);
  assert.strictEqual(totalWithExtra(12400, null), 12400);
});
test("Тариф строкой (из поля формы)", () => {
  assert.strictEqual(totalWithExtra("12400", { on: true, sum: "3000" }), 15400);
});
test("Тариф пустой — итог равен одной доплате", () => {
  assert.strictEqual(totalWithExtra("", { on: true, sum: 3000 }), 3000);
});
test("Копейки не превращаются в 0.30000000000000004", () => {
  assert.strictEqual(totalWithExtra(0.1, { on: true, sum: 0.2 }), 0.3);
});

// ── Обратный ход: тариф из итога ────────────────────────────────
test("Тарифная часть = итог − доплата", () => {
  assert.strictEqual(tariffPartOf(15400, { on: true, sum: 3000 }), 12400);
});
test("Без доплаты тарифная часть равна итогу", () => {
  assert.strictEqual(tariffPartOf(15400, { on: false, sum: 3000 }), 15400);
  assert.strictEqual(tariffPartOf(15400, null), 15400);
});
test("ИНВАРИАНТ: тариф + доплата = итог (перебор)", () => {
  for (const tariff of [0, 1, 12400, 999999, 1234.56])
  for (const sum of [0, 1, 3000, 0.05, 7777.77])
  for (const on of [true, false]) {
    const extra = { on, sum };
    const total = totalWithExtra(tariff, extra);
    assert.strictEqual(
      tariffPartOf(total, extra),
      Math.round((parseFloat(tariff) + Number.EPSILON) * 100) / 100,
      `тариф ${tariff} доплата ${on ? sum : 0}: итог ${total} разобрался неверно`
    );
  }
});

// ── Итог ────────────────────────────────────────────────────────
console.log(`\nИтого (extraSum): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
