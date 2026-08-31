// ============================================================
// Правка бланка СМР (public/templates/template_smr.docx).
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ СКРИПТ. Шаблон — двоичный zip, его правка в git выглядит
// как «изменился файл» и не читается на ревью. Скрипт хранит САМИ правки
// текстом: видно, что именно поменяли в бланке и почему. Запускается
// вручную и идемпотентно — повторный прогон ничего не портит:
//     node scripts/fix-smr-template.mjs
//
// ЧТО ЧИНИМ (замечания заказчика «текст наслаивается / обрезается»).
//
// 1. НАСЛАИВАНИЕ ШАПКИ. В бланке есть плавающая группа (значок «СМР»,
//    «Международная товарно-транспортная накладная / Internationaler
//    Frachtbrief» и оговорка КДПГ). Обтекание у неё «перед текстом»,
//    положение — от края бумаги: X 12,4–264,5 pt, Y 0,2–72,3 pt.
//    Верхнее поле страницы было 426 twip (21,3 pt), поэтому таблица
//    начиналась на Y≈44 pt и графа 1 «Отправитель» вместе с первыми
//    строками наименования/адреса отправителя оказывалась ПОД этой
//    группой. Поднимаем верхнее поле так, чтобы текст начинался ниже
//    группы, а нижнее поджимаем, чтобы бланк остался на одной странице.
//
// 2. ОБРЕЗАННЫЙ ПРАВЫЙ КРАЙ. Таблица объявлена шириной 16463 twip при
//    печатной ширине 11907−567−567 = 10773 twip. Последняя (36-я) колонка
//    сетки — пустая во всех строках, 5539 twip: она целиком висела за
//    краем листа. Оставшиеся 10924 twip реального бланка тоже не влезали
//    — правая графа («Подпись и штамп получателя») срезалась на 151 twip.
//    Схлопываем пустую колонку и поджимаем боковые поля: 10924 < 11227.
//
// 3. ФИО ВОДИТЕЛЯ НЕ НА СВОЕЙ СТРОКЕ. Подпись графы «Фамилии водителей»
//    разнесена на две строки: «Фамилии» и «Водителей ______». Токен
//    {driver} стоял на строке ПОДПИСИ («Фамилии»), а линия для заполнения
//    под «Водителей» оставалась пустой — фамилия печаталась вплотную к
//    подписи и красным шрифтом бланка 6 pt, как служебная надпись.
//    Переносим значение на его строку и делаем чёрным 8 pt.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import PizZip from "pizzip";

const FILE = path.resolve("public/templates/template_smr.docx");
const ENTRY = "word/document.xml";

// Пустая 36-я колонка: во что схлопываем (0 Word не любит, 20 twip незаметны).
const PHANTOM_WIDTH = 5539;
const PHANTOM_KEEP = 20;

const RUN_PROPS_LABEL = '<w:rPr><w:color w:val="FF0000"/><w:sz w:val="12"/><w:szCs w:val="12"/></w:rPr>';
// Значение — чёрным и крупнее подписи, иначе фамилия читается как часть бланка.
const RUN_PROPS_VALUE = '<w:rPr><w:b/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>';

const zip = new PizZip(fs.readFileSync(FILE));
let xml = zip.file(ENTRY).asText();
const before = xml;
const done = [];
const skipped = [];

// ── 1+2. Поля страницы ──────────────────────────────────────
// top: 426 → 1480 twip (74 pt) — ниже плавающей шапки (72,3 pt).
// left/right: 567 → 340 twip — чтобы реальные 10924 twip таблицы влезли.
// bottom: 295 → 200 twip — вернуть высоту, съеденную верхним полем.
const PGMAR_OLD = '<w:pgMar w:top="426" w:right="567" w:bottom="295" w:left="567" w:header="720" w:footer="720" w:gutter="0"/>';
const PGMAR_NEW = '<w:pgMar w:top="1480" w:right="340" w:bottom="200" w:left="340" w:header="720" w:footer="720" w:gutter="0"/>';
if (xml.includes(PGMAR_OLD)) {
  xml = xml.replace(PGMAR_OLD, PGMAR_NEW);
  done.push("поля страницы: top 426→1480, left/right 567→340, bottom 295→200");
} else if (xml.includes(PGMAR_NEW)) {
  skipped.push("поля страницы уже поправлены");
} else {
  throw new Error("не найден <w:pgMar> в ожидаемом виде — бланк заменили, правку надо пересмотреть");
}

// ── 2. Пустая последняя колонка ─────────────────────────────
// Схлопываем и в сетке таблицы, и в каждой строке (tcW), и уменьшаем
// объявленную ширину таблицы на ту же величину.
const shrink = PHANTOM_WIDTH - PHANTOM_KEEP;
const gridHits = (xml.match(new RegExp(`<w:gridCol w:w="${PHANTOM_WIDTH}"/>`, "g")) || []).length;
const cellHits = (xml.match(new RegExp(`<w:tcW w:w="${PHANTOM_WIDTH}" w:type="dxa"/>`, "g")) || []).length;
if (gridHits || cellHits) {
  xml = xml
    .split(`<w:gridCol w:w="${PHANTOM_WIDTH}"/>`).join(`<w:gridCol w:w="${PHANTOM_KEEP}"/>`)
    .split(`<w:tcW w:w="${PHANTOM_WIDTH}" w:type="dxa"/>`).join(`<w:tcW w:w="${PHANTOM_KEEP}" w:type="dxa"/>`)
    .replace('<w:tblW w:w="16463" w:type="dxa"/>', `<w:tblW w:w="${16463 - shrink}" w:type="dxa"/>`);
  done.push(`пустая колонка ${PHANTOM_WIDTH}→${PHANTOM_KEEP} twip (сетка ${gridHits}, ячеек ${cellHits}); ширина таблицы 16463→${16463 - shrink}`);
} else {
  skipped.push("пустая колонка уже схлопнута");
}

// ── 3. ФИО водителя на свою строку ──────────────────────────
// Убираем токен со строки подписи «Фамилии». Токен разбит на два прогона
// ({ и driver}) — вырезаем оба вместе с пробельными прогонами перед ними.
const TOKEN_RUNS =
  `<w:r w:rsidRPr="006A046E">${RUN_PROPS_LABEL}<w:t xml:space="preserve"> </w:t></w:r>` +
  `<w:r w:rsidRPr="006A046E">${RUN_PROPS_LABEL}<w:t>{</w:t></w:r>` +
  `<w:r w:rsidRPr="006A046E">${RUN_PROPS_LABEL}<w:t>driver}</w:t></w:r>`;

// Прогоны в файле могут нести доп. атрибут w:lang — ищем по «хвосту» токена
// и срезаем ровно два прогона перед ним.
const driverTail = '<w:t>driver}</w:t></w:r>';
const tailAt = xml.indexOf(driverTail);
if (tailAt !== -1) {
  const end = tailAt + driverTail.length;
  // начало прогона с «{»
  const runOpen = xml.lastIndexOf("<w:r ", xml.lastIndexOf("<w:r ", tailAt) - 1);
  xml = xml.slice(0, runOpen) + xml.slice(end);
  done.push("токен {driver} убран со строки подписи «Фамилии»");
} else {
  skipped.push("токен {driver} на строке «Фамилии» не найден (уже перенесён)");
}

// Ставим значение на строку «Водителей», вместо линии для ручного заполнения.
const LINE_OLD = '<w:t xml:space="preserve">     ____________________________</w:t>';
const LINE_NEW =
  '<w:t xml:space="preserve">     </w:t></w:r>' +
  `<w:r>${RUN_PROPS_VALUE}<w:t>{driver}</w:t>`;
if (xml.includes(LINE_OLD)) {
  xml = xml.replace(LINE_OLD, LINE_NEW);
  done.push("ФИО водителя перенесено на строку «Водителей», чёрным 8 pt");
} else {
  skipped.push("строка «Водителей» уже несёт {driver}");
}

// ── 4. Подписи цепочки в графы 22 и 23 ──────────────────────
//
// ТЗ: клиент подписывает документ, водитель — приём груза к перевозке.
// Подпись получателя ({%signature_receiver}) в бланке уже была, в графе 24.
// Ставим соседние:
//   графа 22 «Подпись и штамп отправителя»  → {%signature_client}
//   графа 23 «Подпись и штамп перевозчика»  → {%signature_driver}
// Тег вставляется отдельным прогоном ПОСЛЕ подписи графы, как сделано у
// получателя. Подписи нет — docxtemplater подставит пустоту (nullGetter),
// и графа останется под ручную роспись.
const SIG_TAGS = [
  {
    // Хвост подписи графы 22, после которого вставляем тег. В бланке у этого
    // прогона стоит xml:space="preserve" и ведущий пробел — ищем как есть.
    after: '<w:t xml:space="preserve"> Unterschrift und Stempel des Absenders</w:t>',
    tag: 'signature_client',
    what: 'графа 22 (отправитель) → {%signature_client}',
  },
  {
    // В графе 23 уже стоит {%stamp} — печать перевозчика. Подпись водителя
    // ставим следом за ней, а не вместо: это разные вещи.
    after: '<w:t>{%stamp}</w:t>',
    tag: 'signature_driver',
    what: 'графа 23 (перевозчик) → {%signature_driver}',
  },
];

for (const s of SIG_TAGS) {
  if (xml.includes(`{%${s.tag}}`)) {
    skipped.push(`${s.what} — уже стоит`);
    continue;
  }
  const at = xml.indexOf(s.after);
  if (at === -1) {
    skipped.push(`${s.what} — якорь не найден, тег НЕ добавлен`);
    continue;
  }
  // Закрываем текущий прогон и добавляем свой — так тег не наследует
  // оформление подписи графы (мелкий красный шрифт бланка).
  const end = at + s.after.length;
  const closeRun = xml.indexOf('</w:r>', end);
  if (closeRun === -1) {
    skipped.push(`${s.what} — не найден конец прогона, тег НЕ добавлен`);
    continue;
  }
  const insertAt = closeRun + '</w:r>'.length;
  const run = `<w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t>{%${s.tag}}</w:t></w:r>`;
  xml = xml.slice(0, insertAt) + run + xml.slice(insertAt);
  done.push(s.what);
}

if (xml === before) {
  console.log("Бланк уже поправлен, менять нечего.");
} else {
  zip.file(ENTRY, xml);
  fs.writeFileSync(FILE, zip.generate({ type: "nodebuffer" }));
  console.log("template_smr.docx обновлён:");
}
done.forEach((d) => console.log("  ✔ " + d));
skipped.forEach((s) => console.log("  · " + s));
