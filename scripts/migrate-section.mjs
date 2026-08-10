// Миграция: проставить каждой накладной единое состояние details.section.
//
// ПРАВИЛО. Состояние выводится из старых флагов функцией deriveSection из
// src/shared/acts/section.js — той же самой, которой пользуется интерфейс.
// Дублировать правило здесь нельзя: разъедется при первой же правке.
//
// ЧТО ПИШЕТ. Только один новый ключ details.section. Старые флаги
// (isWarehouse, docType, type, readyForAccountant, isDeferredForAccountant)
// НЕ трогаются: пока правка не обкатана, по ним возможен откат — достаточно
// перестать читать section.
//
// ЧАСТНЫЕ (type = SIMPLE) ПРОПУСКАЮТСЯ. У них своя машина статусов
// (act/sent/done/deferred) и к разделам юрлиц они отношения не имеют.
// Незачем трогать их details ради поля, которое там никто не читает.
//
// Запуск:
//   node scripts/migrate-section.mjs                 — сухой прогон (ничего не пишет)
//   node scripts/migrate-section.mjs --apply         — записать
//   node scripts/migrate-section.mjs --url=postgresql://...
//
// Без --apply не пишет НИЧЕГО. Это защита от случайного запуска по проду.

import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";
import { deriveSection, isKnownSection, SECTION } from "../src/shared/acts/section.js";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const urlArg = args.find((a) => a.startsWith("--url="));
const outArg = args.find((a) => a.startsWith("--out="));
const DB_URL = urlArg ? urlArg.slice("--url=".length) : process.env.DATABASE_URL;

if (!DB_URL) {
  console.error("Не задан DATABASE_URL. Передайте --url=... или переменную окружения.");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

function parseDetails(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    const p = JSON.parse(String(raw));
    return p && typeof p === "object" ? p : {};
  } catch {
    return null; // именно null — отличаем битый JSON от пустого
  }
}

const KNOWN_TYPES = new Set(["REQUEST", "SIMPLE", "ttn", "smr", "TTN", "SMR", "warehouse", "", null, undefined]);

// Записи, которые нужно посмотреть глазами. Под правило подпадают ВСЕ (последняя
// ветка deriveSection — act), поэтому «не подошло ни под одно правило» здесь
// означает не отсутствие результата, а противоречивые или нераспознанные данные.
function inspect(row, d, section) {
  const flags = [];
  const isTtn = d.docType === "ttn" || row.type === "ttn" || row.type === "TTN";
  const isSmr = d.docType === "smr" || row.type === "smr" || row.type === "SMR";

  if (d.isWarehouse && (isTtn || isSmr)) flags.push("КОНФЛИКТ: склад + документ (был дубль)");
  if (d.readyForAccountant && d.isDeferredForAccountant) flags.push("КОНФЛИКТ: бухгалтер + отложено (была невидима)");
  if (!KNOWN_TYPES.has(row.type)) flags.push(`НЕОПОЗНАННЫЙ type: ${JSON.stringify(row.type)}`);
  if (d.docType && !["ttn", "smr"].includes(d.docType)) flags.push(`НЕОПОЗНАННЫЙ docType: ${JSON.stringify(d.docType)}`);
  // Проверки «складские услуги есть, а галочки нет» здесь НЕТ намеренно:
  // warehouseServices — общая таблица услуг для любой заявки, её заполняет
  // кнопка расчёта по тарифу (ActCreatePage: setWarehouseServices с описанием
  // услуги). «Складскими» они называются только в заголовке при isWarehouse.
  // Признаком склада эта таблица не является, проверка давала ложные срабатывания.
  if (isKnownSection(d.section) && d.section !== section) {
    flags.push(`РАСХОЖДЕНИЕ: записано ${d.section}, выведено ${section}`);
  }
  return flags;
}

const stats = Object.fromEntries(Object.values(SECTION).map((s) => [s, 0]));
const samples = Object.fromEntries(Object.values(SECTION).map((s) => [s, []]));
const suspicious = [];
const broken = [];
let total = 0, skippedSimple = 0, alreadyHad = 0, toWrite = 0, written = 0;

const rows = await prisma.request.findMany({
  select: { id: true, docNumber: true, type: true, status: true, createdAt: true, details: true },
  orderBy: { createdAt: "asc" },
});
total = rows.length;

for (const row of rows) {
  const d = parseDetails(row.details);

  if (d === null) {
    broken.push({ id: row.id, docNumber: row.docNumber, type: row.type });
    continue;
  }

  if (row.type === "SIMPLE" || d.isSimple === true) {
    skippedSimple++;
    continue;
  }

  const section = deriveSection({ ...row, ...d, section: undefined });
  stats[section]++;
  if (isKnownSection(d.section)) alreadyHad++;

  const flags = inspect(row, d, section);
  if (flags.length) {
    suspicious.push({ id: row.id, docNumber: row.docNumber, type: row.type, docType: d.docType ?? null,
      isWarehouse: !!d.isWarehouse, ready: !!d.readyForAccountant, deferred: !!d.isDeferredForAccountant,
      status: row.status, section, flags });
  }

  if (samples[section].length < 8) {
    samples[section].push({
      docNumber: row.docNumber, type: row.type, docType: d.docType ?? null,
      isWarehouse: !!d.isWarehouse, ready: !!d.readyForAccountant, deferred: !!d.isDeferredForAccountant,
      status: row.status,
    });
  }

  if (d.section !== section) {
    toWrite++;
    if (APPLY) {
      await prisma.request.update({
        where: { id: row.id },
        data: { details: JSON.stringify({ ...d, section }) },
      });
      written++;
    }
  }
}

const RU = {
  [SECTION.ACT]: "Заявки", [SECTION.TTN]: "ТТН", [SECTION.SMR]: "СМР",
  [SECTION.WAREHOUSE]: "Склад", [SECTION.ACCOUNTANT]: "Отработанные/Бухгалтерия",
  [SECTION.DEFERRED]: "Отложенные", [SECTION.SIMPLE]: "Частные",
};

const line = "─".repeat(64);
console.log(`\n${line}`);
console.log(APPLY ? "МИГРАЦИЯ: ЗАПИСЬ" : "МИГРАЦИЯ: СУХОЙ ПРОГОН (ничего не записано)");
console.log(`База: ${DB_URL.replace(/:\/\/([^:]+):[^@]*@/, "://$1:***@")}`);
console.log(line);
console.log(`Всего накладных в базе:        ${total}`);
console.log(`Пропущено (частные, SIMPLE):  ${skippedSimple}`);
console.log(`Обработано (юрлица):          ${total - skippedSimple - broken.length}`);
console.log(`Уже имели поле section:       ${alreadyHad}`);
console.log(`Нужно записать:               ${toWrite}`);
if (APPLY) console.log(`Записано:                     ${written}`);

console.log(`\n${line}\nРАСПРЕДЕЛЕНИЕ ПО СОСТОЯНИЯМ\n${line}`);
for (const [s, n] of Object.entries(stats)) {
  if (s === SECTION.SIMPLE) continue;
  console.log(`  ${RU[s].padEnd(28)} ${String(n).padStart(5)}   (${s})`);
}

console.log(`\n${line}\nПРИМЕРЫ ДЛЯ СВЕРКИ ГЛАЗАМИ\n${line}`);
for (const [s, list] of Object.entries(samples)) {
  if (!list.length) continue;
  console.log(`\n▸ ${RU[s]} (${s}):`);
  for (const x of list) {
    const f = [
      x.isWarehouse ? "склад" : null,
      x.ready ? "бухг" : null,
      x.deferred ? "отлож" : null,
      x.docType ? `doc=${x.docType}` : null,
    ].filter(Boolean).join(" ") || "—";
    console.log(`    №${String(x.docNumber || "—").padEnd(12)} type=${String(x.type).padEnd(8)} status=${String(x.status || "—").padEnd(10)} ${f}`);
  }
}

console.log(`\n${line}\nТРЕБУЮТ РАЗБОРА: ${suspicious.length}\n${line}`);
if (!suspicious.length) {
  console.log("  нет — все накладные легли под правило однозначно");
} else {
  for (const x of suspicious) {
    console.log(`\n  №${x.docNumber || "—"}  →  ${RU[x.section]} (${x.section})`);
    console.log(`     type=${x.type} docType=${x.docType} склад=${x.isWarehouse} бухг=${x.ready} отлож=${x.deferred} status=${x.status}`);
    for (const f of x.flags) console.log(`     ⚠ ${f}`);
  }
}

if (broken.length) {
  console.log(`\n${line}\nБИТЫЙ JSON В details: ${broken.length} — ПРОПУЩЕНЫ, НЕ ТРОНУТЫ\n${line}`);
  for (const b of broken) console.log(`  №${b.docNumber || "—"}  id=${b.id}  type=${b.type}`);
}

if (outArg) {
  const path = outArg.slice("--out=".length);
  writeFileSync(path, JSON.stringify({ apply: APPLY, total, skippedSimple, alreadyHad, toWrite, written, stats, samples, suspicious, broken }, null, 2), "utf8");
  console.log(`\nОтчёт сохранён: ${path}`);
}

console.log(`\n${APPLY ? "Готово." : "Сухой прогон завершён. Для записи добавьте --apply"}\n`);
await prisma.$disconnect();
