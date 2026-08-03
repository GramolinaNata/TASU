// Тесты подбора контрагента для инлайн-подсказки.
// Запуск: node src/shared/counterparty/counterpartyMatch.test.mjs (или npm test).
//
// ЗАЧЕМ: заказчик отдельно оговорил, что искать надо не только по ФИО, но и по
// номеру телефона — иначе менеджер, начавший ввод с номера, не найдёт готового
// контрагента и заведёт дубль. Здесь это зафиксировано проверками, а не обещанием.
import assert from "node:assert";
import { matches, findCounterpartyHints, subtitle, digits } from "./counterpartyMatch.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("✓ " + name); }
  catch (e) { failed++; console.error("✗ FAIL: " + name + "\n   " + e.message); }
}

const CP = {
  ivanov:  { id: "1", name: "Иванов Иван", companyName: "ТОО Ромашка", bin: "123456789012", phone: "+7 777 123 45 67" },
  petrov:  { id: "2", name: "Петров Пётр", companyName: "ИП Петров",  bin: "987654321098", phone: "87051234567" },
  contact: { id: "3", name: "Склад Алматы", companyName: "", bin: "", phone: "", contactPhone: "+7 (701) 555-33-22" },
  noPhone: { id: "4", name: "Без телефона", companyName: "ТОО Пустышка", bin: "", phone: "" },
};
const ALL = Object.values(CP);

// ── По имени и компании ─────────────────────────────────────────
test("Ищет по имени", () => {
  assert.ok(matches(CP.ivanov, "иван"));
  assert.ok(!matches(CP.petrov, "иван"));
});
test("Ищет по названию компании", () => {
  assert.ok(matches(CP.ivanov, "ромашка"));
});
test("Ищет по БИН", () => {
  assert.ok(matches(CP.petrov, "9876"));
});

// ── По телефону — ради этого правка и делалась ──────────────────
test("Ищет по телефону, набранному без форматирования", () => {
  assert.ok(matches(CP.ivanov, "7771234567"), "должен найтись по цифрам номера");
});
test("Ищет по телефону, набранному с плюсом и пробелами", () => {
  assert.ok(matches(CP.ivanov, "+7 777 123"), "формат ввода не должен мешать");
});
test("Ищет по хвосту номера — менеджер помнит последние цифры", () => {
  assert.ok(matches(CP.ivanov, "4567"));
});
test("Телефон в базе в другом формате (8705…) тоже находится", () => {
  assert.ok(matches(CP.petrov, "705123"));
});
test("Ищет и по contactPhone, а не только по phone", () => {
  assert.ok(matches(CP.contact, "7015553322"));
});
test("Меньше трёх цифр — не совпадение (иначе вывалит пол-базы)", () => {
  assert.ok(!matches(CP.ivanov, "77"), "две цифры не должны давать совпадений по телефону");
});
test("Контрагент без телефона по номеру не находится и не роняет поиск", () => {
  assert.ok(!matches(CP.noPhone, "7771234567"));
});

// ── Порог запроса и выдача ──────────────────────────────────────
test("Меньше двух символов — подсказки нет", () => {
  assert.deepStrictEqual(findCounterpartyHints(ALL, "и"), []);
  assert.deepStrictEqual(findCounterpartyHints(ALL, " "), []);
});
test("Подсказка выдаёт совпадения по имени", () => {
  const r = findCounterpartyHints(ALL, "Иванов");
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].id, "1");
});
test("Подсказка выдаёт совпадение по введённому номеру", () => {
  const r = findCounterpartyHints(ALL, "+7 777 123 45 67");
  assert.strictEqual(r.length, 1, "по полному номеру должен найтись ровно один");
  assert.strictEqual(r[0].id, "1");
});
test("Пустой справочник и мусор на входе не роняют подсказку", () => {
  assert.deepStrictEqual(findCounterpartyHints(null, "иванов"), []);
  assert.deepStrictEqual(findCounterpartyHints(ALL, null), []);
  assert.ok(!matches(null, "иванов"));
});
test("Выдача ограничена восемью совпадениями", () => {
  const many = Array.from({ length: 20 }, (_, i) => ({ id: String(i), name: `Тестов ${i}`, phone: "" }));
  assert.strictEqual(findCounterpartyHints(many, "тестов").length, 8);
});

// ── Вспомогательное ─────────────────────────────────────────────
test("digits оставляет только цифры", () => {
  assert.strictEqual(digits("+7 (777) 123-45-67"), "77771234567");
  assert.strictEqual(digits(null), "");
});
test("Подпись собирается из компании, телефона и БИН", () => {
  assert.strictEqual(subtitle(CP.ivanov), "ТОО Ромашка · +7 777 123 45 67 · БИН 123456789012");
  assert.strictEqual(subtitle({ name: "Только имя" }), "");
});

console.log(`\nИтого (counterpartyMatch): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
