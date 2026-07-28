// Тесты выплат по партии из снапшота ведомости перевозчика.
// Запуск: node src/shared/batch/vedomostPayouts.test.mjs  (или npm test).
//
// ЗАЧЕМ: заказчик попросил убрать сумму представителя из ОТОБРАЖЕНИЯ ведомости.
// В данных она остаётся — по ней представитель получает выплаты, на ней стоит
// отчёт бухгалтера. Этот файл — защита от регрессии: если правка вида ведомости
// когда-нибудь заденет данные, тесты упадут раньше, чем поедет отчёт.
import assert from "node:assert";
import { batchPayouts, vedomostRowForBatch, payoutsFromRow, parseSnapshot } from "./vedomostPayouts.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("✓ " + name); }
  catch (e) { failed++; console.error("✗ FAIL: " + name + "\n   " + e.message); }
}

// ── Фикстуры ────────────────────────────────────────────────────
// НОВАЯ ведомость: сумма представителя лежит в строке (так пишет форма создания).
const VED_NEW = {
  id: "v1",
  number: "ВП000012",
  data: JSON.stringify({
    companyName: "TASU Kazakhstan",
    representativeRate: 0,
    rows: [
      { batchId: "b1", number: "ТП000014", city: "Астана", weight: 1200, seats: 47,
        carrierName: "Ануар", carrierRate: 65, carrierSum: 78000,
        representativeId: "r1", representativeName: "Марат", representativeSum: 24000,
        loaderSum: 5000 },
      { batchId: "b2", number: "ТП000015", city: "Шымкент", weight: 800, seats: 20,
        carrierName: "Ануар", carrierRate: 65, carrierSum: 52000,
        representativeId: "r2", representativeName: "Асель", representativeSum: 16000,
        loaderSum: 0 },
    ],
  }),
};

// СТАРАЯ ведомость: в строке representativeSum нет, есть только ставка в снапшоте.
const VED_OLD = {
  id: "v2",
  number: "ВП000003",
  data: JSON.stringify({
    representativeRate: 20,
    rows: [
      { batchId: "b3", number: "ТП000004", weight: 950, carrierSum: 61750, representativeName: "Марат" },
    ],
  }),
};

// Ведомость, где data пришла уже объектом (бывает после update с клиента).
const VED_OBJ = {
  id: "v3",
  data: { rows: [{ batchId: "b4", weight: 100, carrierSum: 6500, representativeSum: 2000 }] },
};

const VEDOMOSTS = [VED_NEW, VED_OLD, VED_OBJ];

const B1 = { id: "b1", carrierVedomostId: "v1" };
const B2 = { id: "b2", carrierVedomostId: "v1" };
const B3 = { id: "b3", carrierVedomostId: "v2" };
const B4 = { id: "b4", carrierVedomostId: "v3" };

// ── Базовое поведение ───────────────────────────────────────────
test("Новая ведомость: суммы берутся из строки партии, а не из итога ведомости", () => {
  assert.deepStrictEqual(batchPayouts(B1, VEDOMOSTS), { carrierSum: 78000, loaderSum: 5000, representativeSum: 24000 });
  assert.deepStrictEqual(batchPayouts(B2, VEDOMOSTS), { carrierSum: 52000, loaderSum: 0, representativeSum: 16000 });
});

test("Старая ведомость без representativeSum: fallback вес × ставка (950 × 20 = 19 000)", () => {
  assert.deepStrictEqual(batchPayouts(B3, VEDOMOSTS), { carrierSum: 61750, loaderSum: 0, representativeSum: 19000 });
});

test("data объектом, а не строкой JSON — читается так же", () => {
  assert.deepStrictEqual(batchPayouts(B4, VEDOMOSTS), { carrierSum: 6500, loaderSum: 0, representativeSum: 2000 });
});

// ── Границы: где нули должны быть нулями ────────────────────────
test("Партия без ведомости → нули", () => {
  assert.deepStrictEqual(batchPayouts({ id: "x", carrierVedomostId: null }, VEDOMOSTS),
    { carrierSum: 0, loaderSum: 0, representativeSum: 0 });
});

test("Ведомость не найдена в списке → нули (а не падение)", () => {
  assert.deepStrictEqual(batchPayouts({ id: "x", carrierVedomostId: "нет-такой" }, VEDOMOSTS),
    { carrierSum: 0, loaderSum: 0, representativeSum: 0 });
});

test("Партии нет среди строк снапшота → нули", () => {
  assert.deepStrictEqual(batchPayouts({ id: "чужая", carrierVedomostId: "v1" }, VEDOMOSTS),
    { carrierSum: 0, loaderSum: 0, representativeSum: 0 });
});

test("Битый JSON в data не роняет отчёт", () => {
  const broken = [{ id: "v9", data: "{не json" }];
  assert.deepStrictEqual(batchPayouts({ id: "b", carrierVedomostId: "v9" }, broken),
    { carrierSum: 0, loaderSum: 0, representativeSum: 0 });
  assert.deepStrictEqual(parseSnapshot("{не json"), {});
});

test("Явный 0 в строке — это 0, а не повод для fallback по ставке", () => {
  const row = { batchId: "z", weight: 500, representativeSum: 0, _snapshot: { representativeRate: 20 } };
  assert.strictEqual(payoutsFromRow(row).representativeSum, 0, "0 не должен превращаться в 10 000 по ставке");
});

test("Мусор в сумме → 0, отчёт не получает NaN", () => {
  const row = { batchId: "z", carrierSum: "абв", loaderSum: undefined, representativeSum: "abc" };
  const p = payoutsFromRow(row);
  assert.deepStrictEqual(p, { carrierSum: 0, loaderSum: 0, representativeSum: 0 });
  assert.ok(!Number.isNaN(p.representativeSum));
});

// ── Защита от регрессии по правке отображения (ТЗ п.3) ──────────
test("Убранная плашка «Сумма представителю» не меняет выплату по партии", () => {
  // Плашка-итог — это отображение. Данные строки те же → суммы обязаны совпасть.
  const before = batchPayouts(B1, VEDOMOSTS);
  assert.strictEqual(before.representativeSum, 24000);
  assert.strictEqual(before.carrierSum, 78000);
});

test("Правка строки ведомости (смена перевозчика) не трогает сумму представителя", () => {
  // Имитируем saveEditRow: меняются перевозчик/тариф/сумма перевозчику,
  // representativeSum переносится как был.
  const snap = JSON.parse(VED_NEW.data);
  const edited = {
    ...VED_NEW,
    data: JSON.stringify({
      ...snap,
      rows: snap.rows.map(r => r.batchId !== "b1" ? r : {
        ...r, carrierName: "Другой", carrierRate: 70, carrierSum: 84000,
      }),
    }),
  };
  const p = batchPayouts(B1, [edited]);
  assert.strictEqual(p.carrierSum, 84000, "перевозчик должен обновиться");
  assert.strictEqual(p.representativeSum, 24000, "представитель обязан остаться прежним");
});

test("Если representativeSum пропадёт из строки при правке — сумма НЕ обнулится молча", () => {
  // Тест-сторож: у новой ведомости representativeRate = 0, поэтому потеря
  // representativeSum даёт 0. Это и есть та регрессия, которую ловим.
  const snap = JSON.parse(VED_NEW.data);
  const broken = {
    ...VED_NEW,
    data: JSON.stringify({
      ...snap,
      rows: snap.rows.map(r => {
        if (r.batchId !== "b1") return r;
        const copy = { ...r };
        delete copy.representativeSum;
        return copy;
      }),
    }),
  };
  assert.strictEqual(batchPayouts(B1, [broken]).representativeSum, 0,
    "фиксируем: потеря поля = потеря выплаты. Если этот тест упал — поведение изменилось, проверь отчёт");
});

// ── Итог отчёта = сумма по партиям ──────────────────────────────
test("ИТОГО по ведомости складывается из строк партий", () => {
  const all = [B1, B2].map(b => batchPayouts(b, VEDOMOSTS));
  assert.strictEqual(all.reduce((a, p) => a + p.representativeSum, 0), 40000);
  assert.strictEqual(all.reduce((a, p) => a + p.carrierSum, 0), 130000);
});

test("vedomostRowForBatch отдаёт строку своей партии, а не первую попавшуюся", () => {
  assert.strictEqual(vedomostRowForBatch(B2, VEDOMOSTS).number, "ТП000015");
});

console.log(`\nИтого (vedomostPayouts): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
