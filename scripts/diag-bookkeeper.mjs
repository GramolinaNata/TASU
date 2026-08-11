// Диагностика отчёта бухгалтера по частным. Только чтение, ничего не меняет.
import { PrismaClient } from "@prisma/client";
import { getTariffCategory, cleanCityName } from "../src/shared/tariff/calcTariff.js";

const prisma = new PrismaClient();
const j = (raw) => { if (!raw) return {}; if (typeof raw === "object") return raw; try { return JSON.parse(raw) || {}; } catch { return {}; } };

const tariffs = await prisma.tariff.findMany();
const batches = await prisma.batch.findMany();
const requests = await prisma.request.findMany();
const veds = await prisma.carrierVedomost.findMany().catch(() => []);

console.log("=== 1. ТАРИФЫ ПО КАТЕГОРИЯМ ===");
const byCat = {};
for (const t of tariffs) {
  const c = getTariffCategory(t);
  (byCat[c] ||= []).push(t);
}
for (const [c, list] of Object.entries(byCat)) {
  console.log(`  ${c.padEnd(18)} ${String(list.length).padStart(3)} шт: ${list.map(t => cleanCityName(t.city)).join(", ")}`);
}

console.log("\n=== 2. ГРУЗЧИКИ: ставки ===");
for (const t of (byCat.loaders || [])) {
  console.log(`  ${cleanCityName(t.city).padEnd(20)} pricePerKg=${t.pricePerKg}  ranges=${JSON.stringify(j(t.weightRanges)._ranges || null)}`);
}
if (!(byCat.loaders || []).length) console.log("  НЕТ НИ ОДНОГО тарифа грузчиков");

console.log("\n=== 3. ПРЕДСТАВИТЕЛИ: ставки ===");
for (const t of (byCat.representatives || [])) {
  const wr = j(t.weightRanges);
  console.log(`  ${cleanCityName(t.city).padEnd(20)} pricePerKg=${t.pricePerKg}  _ranges=${JSON.stringify(wr._ranges || null)}`);
}
if (!(byCat.representatives || []).length) console.log("  НЕТ НИ ОДНОГО тарифа представителей");

console.log("\n=== 4. ВЫГРУЗКА (_unloadPerSeat) в тарифах доставки ===");
let unloadFilled = 0;
for (const t of tariffs) {
  const cat = getTariffCategory(t);
  if (cat !== "legal" && cat !== "private") continue;
  const v = Number(j(t.weightRanges)._unloadPerSeat) || 0;
  if (v > 0) { unloadFilled++; console.log(`  ${cat.padEnd(8)} ${cleanCityName(t.city).padEnd(20)} выгрузка = ${v} тг/место`); }
}
console.log(`  Итого тарифов с заполненной выгрузкой: ${unloadFilled} из ${tariffs.filter(t => ["legal","private"].includes(getTariffCategory(t))).length}`);

console.log("\n=== 5. ПАРТИИ ===");
console.log(`  Всего партий: ${batches.length}`);
for (const b of batches) {
  let ids = []; try { ids = JSON.parse(b.requestIds || "[]"); } catch {}
  const reqs = ids.map(id => requests.find(r => r.id === id)).filter(Boolean);
  const alive = reqs.filter(r => r.status !== "canceled");
  const simple = alive.filter(r => r.type === "SIMPLE" || j(r.details).isSimple === true);
  const weight = alive.reduce((a, r) => a + (Number(j(r.details).totals?.weight) || 0), 0);
  const seats = alive.reduce((a, r) => a + (Number(j(r.details).totals?.seats) || 0), 0);
  console.log(`  Партия ${String(b.number).padEnd(8)} город=${String(b.city).padEnd(14)} накл=${alive.length} (частных ${simple.length}) вес=${weight} мест=${seats} грузчиков=${b.loadersCount} ведомость=${b.carrierVedomostId ? "ЕСТЬ" : "нет"}`);
}

console.log("\n=== 6. ВЕДОМОСТИ ПЕРЕВОЗЧИКА (снапшоты) ===");
console.log(`  Всего ведомостей: ${veds.length}`);
for (const v of veds) {
  const s = j(v.data);
  console.log(`  Ведомость ${v.number} — строк ${Array.isArray(s.rows) ? s.rows.length : 0}`);
  for (const r of (s.rows || [])) {
    console.log(`     партия ${String(r.number).padEnd(8)} город=${String(r.city).padEnd(12)} вес=${String(r.weight).padEnd(7)}` +
      ` перевозчику=${String(r.carrierSum).padEnd(8)} грузчиков=${String(r.loadersCount).padEnd(3)} ставка_гр=${String(r.loaderRate).padEnd(6)} грузчикам=${String(r.loaderSum).padEnd(8)}` +
      ` ставка_пр=${String(r.representativeRate).padEnd(6)} представителю=${r.representativeSum}`);
  }
}

console.log("\n=== 7. ЧАСТНЫЕ НАКЛАДНЫЕ: есть ли вес ===");
const simples = requests.filter(r => r.type === "SIMPLE" || j(r.details).isSimple === true);
console.log(`  Всего частных: ${simples.length}`);
let noWeight = 0;
for (const r of simples) {
  const t = j(r.details).totals || {};
  if (!(Number(t.weight) > 0)) noWeight++;
}
console.log(`  Из них без веса: ${noWeight}`);
console.log(`  Пример: ${simples.slice(0, 5).map(r => { const t = j(r.details).totals || {}; return `№${j(r.details).docNumber || r.docNumber}(вес ${t.weight}, мест ${t.seats})`; }).join("  ")}`);

await prisma.$disconnect();
