// Тесты расчёта налога. Запуск: npm test
// Главное, что они фиксируют: порядок вычетов в ОУР, влияние признака
// официальности перевозки и НЕИЗМЕННОСТЬ старого поведения там, где ставка
// КПН не заполнена.
import assert from "node:assert";
import { calcTax, taxSettingsOf } from "./calcTax.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("✓ " + name); }
  catch (e) { failed++; console.error("✗ FAIL: " + name + "\n   " + e.message); }
}

// ---- обратная совместимость: без ставки КПН отчёт не меняется ----

test("ОУР без ставки КПН считается ровно как раньше — только НДС", () => {
  const r = calcTax({ income: 1_000_000, taxMode: "our", vatRate: 16, kpnRate: 0 });
  assert.strictEqual(r.vat, 160_000);
  assert.strictEqual(r.kpn, 0);
  assert.strictEqual(r.total, 160_000);          // == income * vatRate/100, как в прежней формуле
});
test("Упрощёнка не затронута: ставка + доп. сбор от оборота", () => {
  const r = calcTax({ income: 500_000, taxMode: "simplified", taxRate: 3, taxExtra: 1 });
  assert.strictEqual(r.total, 20_000);            // 500000 * 4%
  assert.strictEqual(r.vat, 0);
  assert.strictEqual(r.kpn, 0);
});
test("Режим none не затронут: процент от оборота", () => {
  assert.strictEqual(calcTax({ income: 200_000, taxMode: "none", taxRate: 5 }).total, 10_000);
});
test("Нераспознанный режим ведёт себя как none", () => {
  assert.strictEqual(calcTax({ income: 100_000, taxMode: "чтотопопало", taxRate: 2 }).total, 2_000);
});

// ---- порядок расчёта ОУР по ТЗ заказчика ----

test("ПРИМЕР ЗАКАЗЧИКА С СОЗВОНА: оборот 400, перевозка 300 → итог 32.4", () => {
  const r = calcTax({
    income: 400, carrierSum: 300, carrierOfficial: true,
    taxMode: "our", vatRate: 16, kpnRate: 10,
  });
  assert.strictEqual(r.vat, 64, "НДС 16% от полного оборота");
  assert.strictEqual(r.afterVat, 336, "остаток после НДС");
  assert.strictEqual(r.deducted, 300, "вычтена официальная перевозка");
  assert.strictEqual(r.kpnBase, 36, "остаток после НДС и перевозки");
  assert.strictEqual(r.kpn, 3.6, "КПН 10% от остатка, ПОСЛЕДНИМ");
  assert.strictEqual(r.net, 32.4, "ИТОГ");
  assert.strictEqual(r.total, 67.6, "в бюджет: НДС + КПН");
});

test("Порядок строгий: КПН берётся от остатка, а не от оборота", () => {
  const r = calcTax({ income: 400, carrierSum: 300, carrierOfficial: true, taxMode: "our", vatRate: 16, kpnRate: 10 });
  assert.notStrictEqual(r.kpn, 40, "КПН не от оборота (400×10%)");
  assert.notStrictEqual(r.kpn, 33.6, "КПН не от остатка после НДС без вычета перевозки");
  assert.strictEqual(r.kpn, 3.6);
});

test("Тот же пример в тысячах — пропорция сохраняется", () => {
  const r = calcTax({
    income: 400_000, carrierSum: 300_000, carrierOfficial: true,
    taxMode: "our", vatRate: 16, kpnRate: 10,
  });
  assert.strictEqual(r.vat, 64_000);
  assert.strictEqual(r.kpnBase, 36_000);
  assert.strictEqual(r.kpn, 3_600);
  assert.strictEqual(r.net, 32_400);
});

test("Неофициальная перевозка НЕ вычитается", () => {
  const r = calcTax({
    income: 400, carrierSum: 300, carrierOfficial: false,
    taxMode: "our", vatRate: 16, kpnRate: 10,
  });
  assert.strictEqual(r.deducted, 0);
  assert.strictEqual(r.kpnBase, 336, "остаток только после НДС");
  assert.strictEqual(r.kpn, 33.6);
  assert.strictEqual(r.net, 302.4);
});

test("Официальная перевозка выгоднее ровно на КПН с её суммы", () => {
  const общий = { income: 400, carrierSum: 300, taxMode: "our", vatRate: 16, kpnRate: 10 };
  const офиц = calcTax({ ...общий, carrierOfficial: true });
  const нет = calcTax({ ...общий, carrierOfficial: false });
  assert.strictEqual(Math.round((нет.total - офиц.total) * 100) / 100, 30);  // 300 × 10%
});

test("Перевозки нет — остаток это оборот минус НДС", () => {
  const r = calcTax({ income: 400, carrierOfficial: true, taxMode: "our", vatRate: 16, kpnRate: 10 });
  assert.strictEqual(r.kpnBase, 336);
  assert.strictEqual(r.kpn, 33.6);
});

test("Дробь не тянет двоичный хвост (36 × 10% = 3.6, а не 3.6000000000000005)", () => {
  const r = calcTax({ income: 400, carrierSum: 300, carrierOfficial: true, taxMode: "our", vatRate: 16, kpnRate: 10 });
  assert.strictEqual(String(r.kpn), "3.6");
  assert.strictEqual(String(r.net), "32.4");
});

// ---- защита от отрицательной базы ----

test("Убыточная партия: остаток не уходит в минус, КПН = 0", () => {
  const r = calcTax({
    income: 100_000, carrierSum: 500_000, carrierOfficial: true,
    taxMode: "our", vatRate: 16, kpnRate: 10,
  });
  assert.strictEqual(r.kpnBase, 0);
  assert.strictEqual(r.kpn, 0);
  assert.strictEqual(r.net, 0);
  assert.strictEqual(r.total, r.vat);             // остаётся только НДС
  assert.ok(r.total >= 0, "налог не может быть отрицательным");
});

// ---- устойчивость ----

test("Пустой вызов не роняет и даёт нули", () => {
  const r = calcTax();
  assert.deepStrictEqual(
    { vat: r.vat, kpn: r.kpn, total: r.total },
    { vat: 0, kpn: 0, total: 0 }
  );
});
test("Мусор в числах трактуется как 0", () => {
  const r = calcTax({ income: "не число", taxMode: "our", vatRate: null, kpnRate: undefined });
  assert.strictEqual(r.total, 0);
});
test("Строковые ставки из формы (input даёт строку) считаются верно", () => {
  const r = calcTax({
    income: "400", carrierSum: "300", carrierOfficial: true,
    taxMode: "our", vatRate: "16", kpnRate: "10",
  });
  assert.strictEqual(r.net, 32.4);
  assert.strictEqual(r.total, 67.6);
});

// ---- ставки берутся из компании, а не из кода ----

test("Ставки читаются из карточки компании", () => {
  const s = taxSettingsOf({ taxMode: "our", vatRate: 16, kpnRate: 10, taxRate: 3, taxExtra: 1 });
  assert.deepStrictEqual(s, { taxMode: "our", taxRate: 3, taxExtra: 1, vatRate: 16, kpnRate: 10 });
});
test("У компании без ставок — нули и режим none", () => {
  assert.deepStrictEqual(taxSettingsOf(null), { taxMode: "none", taxRate: 0, taxExtra: 0, vatRate: 0, kpnRate: 0 });
});
test("Старая компания без kpnRate: КПН нулевой, поведение прежнее", () => {
  const старая = { taxMode: "our", vatRate: 16 };   // поля kpnRate в записи нет вовсе
  const r = calcTax({ income: 1_000_000, ...taxSettingsOf(старая) });
  assert.strictEqual(r.kpn, 0);
  assert.strictEqual(r.total, 160_000);
});

console.log(`\nИтого (calcTax): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
