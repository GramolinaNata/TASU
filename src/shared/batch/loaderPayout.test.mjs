import test from 'node:test';
import assert from 'node:assert/strict';
import { findLoaderTariff, loaderPayout } from './loaderPayout.js';

const TARIFFS = [
  { city: 'Алматы__LOADERS', pricePerKg: 12, weightRanges: { _category: 'loaders' } },
  { city: 'Астана__LOADERS', pricePerKg: 15, weightRanges: { _category: 'loaders' } },
  // Тариф перевозчиков по тому же городу — не должен подхватываться.
  { city: 'Алматы__CARRIERS', pricePerKg: 99, weightRanges: { _category: 'carriers' } },
];

test('тариф ищется по городу И категории', () => {
  assert.equal(findLoaderTariff(TARIFFS, 'Алматы')?.pricePerKg, 12);
  assert.equal(findLoaderTariff(TARIFFS, 'алматы')?.pricePerKg, 12, 'регистр не важен');
  assert.equal(findLoaderTariff(TARIFFS, 'Алматы__LOADERS')?.pricePerKg, 12, 'суффикс снимается с обеих сторон');
  assert.equal(findLoaderTariff(TARIFFS, 'Костанай'), null);
});

test('формула та же, что в ведомости: вес × ставка, с округлением', () => {
  assert.deepEqual(
    loaderPayout({ loadersCount: 2, weight: 1420, city: 'Алматы', tariffs: TARIFFS }),
    { sum: 17040, rate: 12, known: true }
  );
  // Количество грузчиков — выключатель, а не множитель: ставка задана на партию.
  assert.equal(loaderPayout({ loadersCount: 1, weight: 1420, city: 'Алматы', tariffs: TARIFFS }).sum, 17040);
  assert.equal(loaderPayout({ loadersCount: 5, weight: 1420, city: 'Алматы', tariffs: TARIFFS }).sum, 17040);
});

test('округление до тенге', () => {
  assert.equal(loaderPayout({ loadersCount: 1, weight: 10.4, city: 'Астана', tariffs: TARIFFS }).sum, 156);
});

test('грузчиков нет — честный ноль, и он ИЗВЕСТЕН', () => {
  const r = loaderPayout({ loadersCount: 0, weight: 1000, city: 'Алматы', tariffs: TARIFFS });
  assert.deepEqual(r, { sum: 0, rate: 0, known: true });
});

test('грузчики есть, тарифа нет — сумма НЕ известна, а не равна нулю', () => {
  const r = loaderPayout({ loadersCount: 3, weight: 1000, city: 'Костанай', tariffs: TARIFFS });
  assert.equal(r.known, false, 'иначе отчёт выдаст «работали бесплатно» за «ставку не завели»');
  assert.equal(r.sum, 0);
});

test('мусор во входных данных не роняет расчёт', () => {
  assert.equal(loaderPayout({ loadersCount: '2', weight: '100', city: 'Алматы', tariffs: TARIFFS }).sum, 1200);
  assert.equal(loaderPayout({ loadersCount: 2, weight: null, city: 'Алматы', tariffs: TARIFFS }).sum, 0);
  assert.equal(loaderPayout({ loadersCount: 2, weight: 100, city: 'Алматы', tariffs: null }).known, false);
});

// ── Зафиксировала ли ведомость сумму грузчиков ───────────────
import { loaderFixedByVedomost } from './loaderPayout.js';

test('ведомости нет — фиксировать нечему', () => {
  assert.equal(loaderFixedByVedomost(null), false);
  assert.equal(loaderFixedByVedomost(undefined), false);
});

test('ведомость посчитала сумму — это факт, пересчёту не подлежит', () => {
  // Реальная строка ВП000004 (партия ЕП000001, Алматы).
  assert.equal(loaderFixedByVedomost({ loadersCount: 2, loaderRate: 10, loaderSum: 2570 }), true);
});

test('loaderMissing — ведомость сама признала, что тарифа не было', () => {
  // Реальная строка ВП000005 (партия П000006, город «вапвап»).
  assert.equal(
    loaderFixedByVedomost({ loadersCount: 3, loaderRate: 0, loaderSum: 0, loaderMissing: true }),
    false,
    'иначе в отчёте будет «0 тг» при трёх назначенных грузчиках'
  );
});

test('старая ведомость без флага: грузчики есть, ставки нет — не зафиксировано', () => {
  // У ВП000001/ВП000002 поля loaderRate нет вовсе.
  assert.equal(loaderFixedByVedomost({ loadersCount: 2, loaderSum: 0 }), false);
  assert.equal(loaderFixedByVedomost({ loadersCount: 2, loaderRate: 0, loaderSum: 0 }), false);
});

test('ноль грузчиков — зафиксированный ноль, а не незнание', () => {
  assert.equal(loaderFixedByVedomost({ loadersCount: 0, loaderSum: 0 }), true);
  assert.equal(loaderFixedByVedomost({ loadersCount: 0 }), true);
});
