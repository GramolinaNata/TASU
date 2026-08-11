// ============================================================
// Проставление details.unloadSum по УЖЕ ВЫПИСАННЫМ частным накладным.
//
// ЗАЧЕМ. Новые накладные сохраняют выгрузку в момент оформления. У старых её
// нет, и отчёт бухгалтера показывает восстановленное значение со звёздочкой.
//
// ЧЕМ ЭТО ОПАСНО. Восстановить можно только по ТЕКУЩЕМУ тарифу. Если тариф
// с тех пор менялся, число разойдётся с тем, что реально вошло в сумму
// накладной, — и в отчёте оценка встанет как факт, без звёздочки. Хуже
// звёздочки может быть только неверное число, которое выглядит точным.
//
// ПОЭТОМУ. Скрипт сверяет пересчёт итога с СОХРАНЁННЫМ итогом накладной.
// Совпало — тариф тот же, выгрузке можно верить. Не совпало — не трогаем,
// пусть остаётся звёздочка.
//
// По умолчанию DRY-RUN: ничего не пишет. Запись — только с --apply.
//   node scripts/backfill-unload-sum.mjs           ← показать, что будет
//   node scripts/backfill-unload-sum.mjs --apply   ← записать
// ============================================================
import { PrismaClient } from "@prisma/client";
import { calcDeliveryPrice } from "../src/shared/tariff/calcTariff.js";
import { flatSizeSurcharge } from "../src/shared/dims/dimGroups.js";
import { readExtra } from "../src/shared/acts/extraSum.js";

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();

const j = (raw) => { if (!raw) return {}; if (typeof raw === "object") return raw; try { return JSON.parse(raw) || {}; } catch { return {}; } };
const num = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);
const pad = (v, w) => String(v).padEnd(w);
const rpad = (v, w) => String(v).padStart(w);

const requests = await prisma.request.findMany();
const tariffs = await prisma.tariff.findMany();

const simples = requests.filter(r => r.type === "SIMPLE" || j(r.details).isSimple === true);
console.log(`Режим: ${APPLY ? "ЗАПИСЬ (--apply)" : "DRY-RUN, ничего не меняется"}`);
console.log(`Частных накладных: ${simples.length}\n`);

const buckets = { already: [], willSet: [], mismatch: [], noTariff: [], noSum: [] };

for (const r of simples) {
  const d = j(r.details);
  const docNumber = d.docNumber || r.docNumber || r.id.slice(0, 8);
  const totals = d.totals || {};
  const seats = num(totals.seats);
  const saved = num(r.totalSum || d.totalSum);
  const row = { id: r.id, docNumber, city: d.route?.toCity || "—", seats, weight: num(totals.weight), saved };

  if (d.unloadSum != null && d.unloadSum !== "") { buckets.already.push(row); continue; }
  if (saved <= 0) { buckets.noSum.push(row); continue; }

  const res = calcDeliveryPrice({
    tariffs,
    city: d.route?.toCity || "",
    fromCity: d.route?.fromCity || "",
    weightKg: num(totals.weight),
    volumeM3: num(d.volumeM3),
    seats,
    prrType: d.prrType || "",
    pallets: num(d.pallets),
    storageMode: d.storageMode || "",
    storageDays: num(d.storageDays),
    cityDelivery: !!d.cityDelivery,
    regionDelivery: d.regionEnabled ? (d.regionDelivery || "") : "",
    sizeCategory: "",
    category: "private",
    withDelivery: d.withDelivery !== false,
    withPickup: d.withPickup === true,
    transport: d.transportType === "avia_console" ? "avia" : "auto",
  });

  if (!res.ok) { buckets.noTariff.push({ ...row, why: res.error }); continue; }

  // Повторяем формулу формы: тариф + надбавка за габарит + доп. сумма.
  const sizeAdd = flatSizeSurcharge(res.tariff, d.sizeCategory || "", seats);
  const extra = readExtra(d);
  const recalc = res.sum + sizeAdd + (extra.on ? extra.sum : 0);
  const unloadLine = (res.lines || []).find(l => l.key === "unload");
  const unload = unloadLine ? num(unloadLine.amount) : 0;
  const diff = Math.round((recalc - saved) * 100) / 100;

  if (diff !== 0) buckets.mismatch.push({ ...row, recalc, diff, unload });
  else buckets.willSet.push({ ...row, unload });
}

const line = (t) => `  №${pad(t.docNumber, 10)} ${pad(t.city, 13)} мест=${rpad(t.seats, 3)} вес=${rpad(t.weight, 7)}`;

console.log("=== 1. УЖЕ ЕСТЬ unloadSum — пропускаем ===");
console.log(`  ${buckets.already.length} шт.`);

console.log("\n=== 2. ПРОСТАВИМ (пересчёт итога СОВПАЛ с сохранённым) ===");
for (const t of buckets.willSet) console.log(line(t) + ` итог=${rpad(t.saved, 8)} → выгрузка ${t.unload} тг`);
console.log(`  Итого: ${buckets.willSet.length} шт.`);

console.log("\n=== 3. НЕ ТРОГАЕМ: тариф разошёлся с сохранённым итогом ===");
for (const t of buckets.mismatch) {
  console.log(line(t) + ` сохранено=${rpad(t.saved, 8)} пересчёт=${rpad(t.recalc, 8)} расхождение=${rpad(t.diff, 9)}` +
    ` (оценка выгрузки была бы ${t.unload} тг — НЕ ЗАПИСЫВАЕМ)`);
}
console.log(`  Итого: ${buckets.mismatch.length} шт.`);

console.log("\n=== 4. НЕ ТРОГАЕМ: тариф не найден ===");
for (const t of buckets.noTariff) console.log(line(t) + `  ${String(t.why).slice(0, 70)}…`);
console.log(`  Итого: ${buckets.noTariff.length} шт.`);

console.log("\n=== 5. НЕ ТРОГАЕМ: у накладной нет суммы (сверить не с чем) ===");
for (const t of buckets.noSum) console.log(line(t));
console.log(`  Итого: ${buckets.noSum.length} шт.`);

const total = simples.length;
const touch = buckets.willSet.length;
const skip = total - touch - buckets.already.length;
console.log("\n=== СВОДКА ===");
console.log(`  Всего частных:            ${total}`);
console.log(`  Уже с выгрузкой:          ${buckets.already.length}`);
console.log(`  БУДЕТ ПРОСТАВЛЕНО:        ${touch}`);
console.log(`  Останется со звёздочкой:  ${skip}`);
if (total - buckets.already.length > 0) {
  const share = Math.round(touch * 100 / (total - buckets.already.length));
  console.log(`  Доля надёжных из непроставленных: ${share}%`);
}

if (!APPLY) {
  console.log("\nDRY-RUN: ничего не записано. Для записи — флаг --apply");
} else {
  console.log(`\nЗапись ${touch} накладных…`);
  let done = 0;
  for (const t of buckets.willSet) {
    const r = requests.find(x => x.id === t.id);
    const d = j(r.details);
    d.unloadSum = t.unload;
    await prisma.request.update({ where: { id: t.id }, data: { details: JSON.stringify(d) } });
    done++;
  }
  console.log(`Готово: ${done}`);
}

await prisma.$disconnect();
