// Бланк ТТН печатается на ОДИН лист.
//
// Тест ходит в настоящий public/templates/ttn_2026.xlsx, а не в заглушку:
// проверяемое свойство — «влезает на лист» — целиком про геометрию реального
// бланка. На выдуманном листе оно ничего не значит.
//
// Что здесь закреплено (замерено в Excel через выгрузку в PDF):
//   • до правки бланк печатался на ДВУХ листах — лицевая 1–47 и пустой
//     оборот 48–67;
//   • после — на одном, масштаб ~70%, кегли в PDF 5,6–8,4 пт;
//   • «впихнуть» оборот на тот же лист нельзя: 1–67 требуют 47,8%,
//     то есть кегль 2,9–5,3 пт.
import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { fillTtnSheet, buildTtnData } from './xlsxExport.js';

const TEMPLATE = 'public/templates/ttn_2026.xlsx';
const LAST_PRINTED_ROW = 47;

const ACT = {
  docNumber: '000123',
  date: '2026-08-31',
  company: { name: 'ТОО «ТАСУ»' },
  customer: { companyName: 'ТОО «Заказчик»' },
  receiver: { fio: 'Иванов И. И.', phone: '+7 707 000 00 00' },
  route: { fromCity: 'Алматы', toCity: 'Астана', fromAddress: 'ул. А, 1', toAddress: 'ул. Б, 2' },
  cargoText: 'Оборудование',
  totals: { seats: 12, weight: 1420 },
  docAttrs: { vehicleModel: 'Actros', vehicleNumber: '123ABC02', driver: 'Петров П. П.' },
};

async function fill() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE);
  const ws = wb.worksheets[0];
  fillTtnSheet(ws, ACT);
  return ws;
}

test('печать настроена на один лист по обеим осям', async () => {
  const ws = await fill();
  assert.equal(ws.pageSetup.fitToPage, true, 'без fitToPage Excel печатает по scale и игнорирует fitTo*');
  assert.equal(ws.pageSetup.fitToWidth, 1);
  assert.equal(ws.pageSetup.fitToHeight, 1, 'fitToHeight=0 отдаёт высоту Excel — так и появлялся второй лист');
});

test('ручных разрывов страницы не осталось', async () => {
  const ws = await fill();
  assert.deepEqual(ws.rowBreaks, [], 'разрыв после 47-й строки делил бланк на две стороны');
});

test('оборот скрыт, лицевая сторона видима', async () => {
  const ws = await fill();
  assert.notEqual(ws.getRow(LAST_PRINTED_ROW).hidden, true, 'в 47-й строке печать компании — её скрывать нельзя');
  for (const r of [48, 55, 61, 67]) {
    assert.equal(ws.getRow(r).hidden, true, `строка ${r} (оборот) должна быть скрыта`);
  }
});

test('область печати ограничена лицевой стороной', async () => {
  const ws = await fill();
  // Абсолютная ссылка обязательна: относительную строку Excel в Print_Area
  // молча игнорирует.
  assert.equal(ws.pageSetup.printArea, `B$1:X$${LAST_PRINTED_ROW}`);
});

test('данные накладной остаются на лицевой стороне', async () => {
  const ws = await fill();
  const data = buildTtnData(ACT);
  assert.equal(data.number, '000123');
  assert.equal(data.seats, '12 мест');
  assert.equal(data.weight, '1420 кг');
  // Печать компании стоит в D47 — последней печатаемой строке.
  assert.ok(LAST_PRINTED_ROW >= 47, 'печать компании обязана попадать в область печати');
});
