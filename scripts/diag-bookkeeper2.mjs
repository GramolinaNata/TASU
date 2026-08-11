// Диагностика №2: выгрузка в расчёте частных + представители в старых ведомостях.
import { PrismaClient } from "@prisma/client";
import { calcDeliveryPrice, getTariffCategory, cleanCityName } from "../src/shared/tariff/calcTariff.js";
import { payoutsFromRow } from "../src/shared/batch/vedomostPayouts.js";

const prisma = new PrismaClient();
const j = (raw) => { if (!raw) return {}; if (typeof raw === "object") return raw; try { return JSON.parse(raw) || {}; } catch { return {}; } };

const tariffs = await prisma.tariff.findMany();
const veds = await prisma.carrierVedomost.findMany().catch(() => []);
const batches = await prisma.batch.findMany();
const requests = await prisma.request.findMany();

console.log("=== A. ВЫГРУЗКА В РАСЧЁТЕ ЧАСТНЫХ (реальные тарифы) ===");
for (const city of ["Жанаозен", "Актау", "Атырау", "Алматы", "Уральск"]) {
  for (const seats of [0, 3]) {
    const r = calcDeliveryPrice({
      tariffs, city, fromCity: "Алматы", weightKg: 25, seats,
      category: "private", withDelivery: true,
    });
    if (!r.ok) { console.log(`  ${city.padEnd(12)} мест=${seats}: ${r.error}`); continue; }
    const un = (r.lines || []).find(l => l.key === "unload");
    console.log(`  ${city.padEnd(12)} мест=${seats}  итог=${String(r.sum).padEnd(8)} выгрузка=${un ? un.amount + " тг" : "НЕТ СТРОКИ"}`);
  }
}

console.log("\n=== B. ЧТО ФАКТИЧЕСКИ СОХРАНЕНО В ЧАСТНЫХ НАКЛАДНЫХ ===");
const simples = requests.filter(r => r.type === "SIMPLE" || j(r.details).isSimple === true);
for (const r of simples) {
  const d = j(r.details);
  const t = d.totals || {};
  console.log(`  №${String(d.docNumber || r.docNumber).padEnd(9)} ${String(d.route?.toCity || "—").padEnd(14)} мест=${String(t.seats ?? "—").padEnd(4)} вес=${String(t.weight ?? "—").padEnd(7)} сумма=${r.totalSum || d.totalSum || "—"}`);
}

console.log("\n=== C. ПРЕДСТАВИТЕЛИ: что отдаёт отчёт по каждой ведомости ===");
for (const v of veds) {
  const s = j(v.data);
  for (const row of (s.rows || [])) {
    const withSnap = { ...row, _snapshot: s };
    const p = payoutsFromRow(withSnap);
    const hasField = row.representativeSum != null;
    console.log(`  ${v.number} / партия ${String(row.number).padEnd(9)} город=${String(row.city).padEnd(12)}` +
      ` вес_снапшот=${String(row.weight).padEnd(7)}` +
      ` поле_representativeSum=${hasField ? row.representativeSum : "НЕТ (старая ведомость)"}` +
      ` snapshot.representativeRate=${s.representativeRate ?? "нет"}` +
      ` → отчёт покажет ${p.representativeSum}`);
  }
}

console.log("\n=== D. ВЕС В СНАПШОТЕ vs ФАКТИЧЕСКИЙ ВЕС НАКЛАДНЫХ ===");
for (const v of veds) {
  const s = j(v.data);
  for (const row of (s.rows || [])) {
    const b = batches.find(x => x.id === row.batchId);
    if (!b) { console.log(`  ${v.number} / ${row.number}: партия не найдена`); continue; }
    let ids = []; try { ids = JSON.parse(b.requestIds || "[]"); } catch {}
    const alive = ids.map(id => requests.find(r => r.id === id)).filter(r => r && r.status !== "canceled");
    const factWeight = alive.reduce((a, r) => a + (Number(j(r.details).totals?.weight) || 0), 0);
    const snapW = Number(row.weight) || 0;
    const mark = snapW === factWeight ? "ok" : `РАСХОЖДЕНИЕ (снапшот ${snapW}, факт ${factWeight})`;
    console.log(`  ${v.number} / партия ${String(row.number).padEnd(9)} накл=${alive.length} ${mark}`);
  }
}

console.log("\n=== E. ТАРИФ ПРЕДСТАВИТЕЛЯ / ГРУЗЧИКА ПО ГОРОДАМ ПАРТИЙ ===");
const cityOfBatch = [...new Set(batches.map(b => b.city).filter(Boolean))];
for (const c of cityOfBatch) {
  const clean = cleanCityName(c);
  const rep = tariffs.find(t => getTariffCategory(t) === "representatives" && cleanCityName(t.city) === clean);
  const ld = tariffs.find(t => getTariffCategory(t) === "loaders" && cleanCityName(t.city) === clean);
  const cr = tariffs.find(t => getTariffCategory(t) === "carriers" && cleanCityName(t.city) === clean);
  console.log(`  ${String(c).padEnd(14)} представитель=${rep ? rep.pricePerKg + " тг/кг" : "НЕТ ТАРИФА"}  грузчик=${ld ? ld.pricePerKg + " тг/кг" : "НЕТ ТАРИФА"}  перевозчик=${cr ? cr.pricePerKg + " тг/кг" : "НЕТ ТАРИФА"}`);
}

await prisma.$disconnect();
