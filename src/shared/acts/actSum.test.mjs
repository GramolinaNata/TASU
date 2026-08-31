// Сумма накладной читается из колонки И из details.
//
// Случаи взяты с прода: там 40 частных накладных, у которых колонка пустая,
// а сумма лежит только в details (например А000001 — 45345, А000003 — 253000).
import test from 'node:test';
import assert from 'node:assert/strict';
import { actTotalSum, actSumText, actSumOrZero } from './actSum.js';

test('колонка заполнена — берём её', () => {
  assert.equal(actTotalSum({ totalSum: '18000' }), 18000);
  assert.equal(actTotalSum({ totalSum: 18000 }), 18000);
});

test('колонка пустая, сумма в details-СТРОКЕ — это и есть починенный случай', () => {
  // Ровно то, что приходит с сервера: details — колонка String, то есть JSON-строка.
  const act = { totalSum: '', details: JSON.stringify({ totalSum: '45345', isSimple: true }) };
  assert.equal(actTotalSum(act), 45345, 'без этого список показывал «—», а карточка — сумму');
});

test('колонка пустая, details уже разобран в объект', () => {
  assert.equal(actTotalSum({ totalSum: '', details: { totalSum: 253000 } }), 253000);
});

test('колонка главнее details', () => {
  // Сегодняшний сервер пишет колонку, она и есть источник правды.
  assert.equal(actTotalSum({ totalSum: '100', details: { totalSum: '999' } }), 100);
});

test('нет суммы нигде — null, а не ноль', () => {
  assert.equal(actTotalSum({ totalSum: '', details: '{}' }), null);
  assert.equal(actTotalSum({ totalSum: null, details: null }), null);
  assert.equal(actTotalSum({}), null);
  assert.equal(actTotalSum(null), null);
});

test('ноль — это значение, а не отсутствие', () => {
  // На проде две такие записи. «0 тг» и «сумма не указана» — разные вещи.
  assert.equal(actTotalSum({ totalSum: '0' }), 0);
  assert.equal(actTotalSum({ totalSum: '', details: { totalSum: 0 } }), 0);
  assert.equal(actSumText({ totalSum: '0' }), '0');
});

test('битый details не роняет чтение', () => {
  assert.equal(actTotalSum({ totalSum: '', details: 'не json' }), null);
  assert.equal(actTotalSum({ totalSum: '500', details: 'не json' }), 500, 'колонка всё равно читается');
  assert.equal(actTotalSum({ totalSum: '', details: '[1,2,3]' }), null, 'массив — не объект деталей');
});

test('мусор в значении не превращается в число', () => {
  assert.equal(actTotalSum({ totalSum: 'нет' }), null);
  assert.equal(actTotalSum({ totalSum: '  ' }), null);
  assert.equal(actTotalSum({ totalSum: '12 300' }), 12300, 'пробелы-разделители разрядов');
  assert.equal(actTotalSum({ totalSum: '1234,5' }), 1234.5, 'запятая как десятичная');
});

test('подпись для ячейки', () => {
  assert.equal(actSumText({ totalSum: '' }), '—');
  // Разделитель разрядов зависит от локали среды (в ru-RU он неразрывный),
  // поэтому сверяем цифры и суффикс, а не конкретный пробел.
  const text = actSumText({ totalSum: '', details: { totalSum: '45345' } }, ' тг');
  assert.match(text, /^45\s345 тг$/u);
});

test('для сортировки и итогов отсутствие = 0', () => {
  assert.equal(actSumOrZero({ totalSum: '' }), 0);
  assert.equal(actSumOrZero({ totalSum: '', details: { totalSum: '700' } }), 700);
});
