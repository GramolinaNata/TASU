// Тесты выбора документа по направлению.
//
// ТЗ: перевозки по Казахстану — СМР, перевозки в Россию — ТТН.
// Главное, что здесь проверяется: существующие тарифы (у которых страны
// не проставлено вовсе) продолжают считаться казахстанскими, а незнакомое
// направление честно сообщает, что страну определить не удалось.

import assert from "node:assert/strict";
import {
  COUNTRY, DOC_BY_COUNTRY, DOC_LABELS, countryLabel, isKnownCountry,
  countryForCity, docKindForRoute, docKindMatches,
} from "./docKind.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("# ✓ " + name); }
  catch (e) { failed++; console.log("# ✗ " + name + " — " + e.message); }
}

// Тариф как он лежит в базе: страна — в weightRanges, колонки под неё нет.
const t = (city, extra = {}, wr = {}) => ({
  city, fromCity: "Алматы", isPrivate: false,
  weightRanges: { _category: "legal", ...wr },
  ...extra,
});

const TARIFFS = [
  t("Астана"),                                        // страна не задана — старый тариф
  t("Костанай", {}, { _country: "KZ" }),
  t("Новосибирск", {}, { _country: "RU" }),
  t("Омск", { fromCity: "Костанай" }, { _country: "RU" }),
  t("Актау", { isPrivate: true }, { _category: "private", _country: "KZ" }),
  t("Курган", { isPrivate: true }, { _category: "private", _country: "RU" }),
];

// ── справочник ──────────────────────────────────────────────

test("Казахстан — СМР, Россия — ТТН", () => {
  assert.equal(DOC_BY_COUNTRY[COUNTRY.KZ], "smr");
  assert.equal(DOC_BY_COUNTRY[COUNTRY.RU], "ttn");
  assert.equal(DOC_LABELS.smr, "СМР");
  assert.equal(DOC_LABELS.ttn, "ТТН");
});

test("Страны только две, подписи по-русски", () => {
  assert.equal(isKnownCountry("KZ"), true);
  assert.equal(isKnownCountry("RU"), true);
  assert.equal(isKnownCountry("BY"), false);
  assert.equal(countryLabel("KZ"), "Казахстан");
  assert.equal(countryLabel("RU"), "Россия");
});

// ── страна по городу ────────────────────────────────────────

test("СТАРЫЙ ТАРИФ без страны считается казахстанским", () => {
  // Ключевая совместимость: в базе у всех тарифов _country нет, и молча
  // переобъявить их российскими было бы враньём.
  const r = countryForCity(TARIFFS, "Астана", "Алматы", "legal");
  assert.equal(r.country, "KZ");
  assert.equal(r.source, "tariff");
});

test("Российское направление опознаётся", () => {
  assert.equal(countryForCity(TARIFFS, "Новосибирск", "Алматы", "legal").country, "RU");
});

test("Регистр и пробелы в городе не мешают", () => {
  assert.equal(countryForCity(TARIFFS, "  новосибирск ", "Алматы", "legal").country, "RU");
});

test("Незнакомый город — страна не определена, умолчание KZ", () => {
  const r = countryForCity(TARIFFS, "Ташкент", "Алматы", "legal");
  assert.equal(r.country, "KZ");
  assert.equal(r.source, "default", "источник обязан говорить, что это умолчание");
});

test("Пустой город не роняет разбор", () => {
  assert.equal(countryForCity(TARIFFS, "", "Алматы", "legal").source, "default");
  assert.equal(countryForCity(TARIFFS, null, null, null).country, "KZ");
  assert.equal(countryForCity([], "Астана", "Алматы", "legal").source, "default");
});

test("Категория учитывается: частные и юрлица заводятся раздельно", () => {
  assert.equal(countryForCity(TARIFFS, "Курган", "Алматы", "private").country, "RU");
  // У юрлиц такого направления нет — значит страна неизвестна.
  assert.equal(countryForCity(TARIFFS, "Курган", "Алматы", "legal").source, "default");
});

test("Пара направлений приоритетнее, но страна от неё не зависит", () => {
  // Омск заведён из Костаная. Спрашиваем из Алматы — точного совпадения нет,
  // но страна у города одна, и терять её из-за пункта отправления нельзя.
  assert.equal(countryForCity(TARIFFS, "Омск", "Алматы", "legal").country, "RU");
  assert.equal(countryForCity(TARIFFS, "Омск", "Костанай", "legal").country, "RU");
});

// ── рекомендация документа ──────────────────────────────────

test("По Казахстану рекомендуется СМР", () => {
  const r = docKindForRoute(TARIFFS, { fromCity: "Алматы", toCity: "Костанай" }, "legal");
  assert.equal(r.kind, "smr");
  assert.equal(r.country, "KZ");
  assert.match(r.reason, /Казахстан/);
});

test("В Россию рекомендуется ТТН", () => {
  const r = docKindForRoute(TARIFFS, { fromCity: "Алматы", toCity: "Новосибирск" }, "legal");
  assert.equal(r.kind, "ttn");
  assert.match(r.reason, /Россия/);
  assert.match(r.reason, /ТТН/);
});

test("Неизвестное направление ГОВОРИТ, что страна не определена", () => {
  // Молчаливое умолчание менеджер прочтёт как «система проверила».
  const r = docKindForRoute(TARIFFS, { fromCity: "Алматы", toCity: "Ташкент" }, "legal");
  assert.equal(r.kind, "smr");
  assert.equal(r.source, "default");
  assert.match(r.reason, /не найдено|не определена/);
});

test("Рекомендация есть даже при пустом маршруте", () => {
  const r = docKindForRoute(TARIFFS, {}, "legal");
  assert.equal(r.kind, "smr");
  assert.equal(r.source, "default");
});

test("Частный тариф в Россию тоже даёт ТТН", () => {
  assert.equal(docKindForRoute(TARIFFS, { toCity: "Курган" }, "private").kind, "ttn");
});

// ── сверка с уже выбранным ──────────────────────────────────

test("Документа ещё нет — сверять нечего", () => {
  assert.equal(docKindMatches({ type: "REQUEST" }, "smr"), null);
  assert.equal(docKindMatches({}, "ttn"), null);
});

test("Совпадение и расхождение с рекомендацией", () => {
  assert.equal(docKindMatches({ docType: "ttn" }, "ttn"), true);
  assert.equal(docKindMatches({ docType: "smr" }, "ttn"), false);
  assert.equal(docKindMatches({ type: "SMR" }, "smr"), true, "регистр не должен мешать");
});

console.log(`\n# Итого (docKind): ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
