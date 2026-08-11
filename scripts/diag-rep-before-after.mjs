// ДО/ПОСЛЕ по суммам представителя в отчёте бухгалтера. Только чтение.
// Запуск: node scripts/diag-rep-before-after.mjs
import { PrismaClient } from "@prisma/client";
import { payoutsFromRow } from "../src/shared/batch/vedomostPayouts.js";

const prisma = new PrismaClient();
const j = (r) => { if (!r) return {}; if (typeof r === "object") return r; try { return JSON.parse(r) || {}; } catch { return {}; } };
const n = (v) => Number(v) || 0;
const pad = (v, w) => String(v).padEnd(w);
const rpad = (v, w) => String(v).padStart(w);

const veds = await prisma.carrierVedomost.findMany({ orderBy: { number: "asc" } });
const batches = await prisma.batch.findMany();
const requests = await prisma.request.findMany();

console.log(`Ведомостей всего: ${veds.length}\n`);

// ── Классификация ───────────────────────────────────────────────
// НОВАЯ  — в строках есть representativeSum (ставка бралась из тарифов).
// СТАРАЯ — строк с representativeSum нет, есть snapshot.representativeRate
//          (ручное поле «Тариф представителя (тг/кг)» прежней формы).
const classify = (s) => {
  const rows = Array.isArray(s.rows) ? s.rows : [];
  const anyRowSum = rows.some(r => r && r.representativeSum != null);
  if (anyRowSum) return "новая";
  if (s.representativeRate != null) return "старая";
  return "без данных";
};

let table = [];
for (const v of veds) {
  const s = j(v.data);
  const rows = Array.isArray(s.rows) ? s.rows : [];
  const kind = classify(s);
  const rate = n(s.representativeRate);

  // ДО — что отчёт показывает сейчас (сумма по всем партиям ведомости).
  const before = rows.reduce((a, r) => a + payoutsFromRow({ ...r, _snapshot: s }).representativeSum, 0);

  // Хранимая колонка ведомости — то, что реально печаталось и выплачивалось.
  const stored = n(v.representativeSum);

  // ВАРИАНТ A: старым — ноль.
  const afterA = kind === "новая" ? before : 0;

  // ВАРИАНТ B: старым — разложить ХРАНИМЫЙ итог по партиям пропорционально весу.
  const totalW = rows.reduce((a, r) => a + n(r.weight), 0);
  const afterB = kind === "новая"
    ? before
    : (totalW > 0 ? stored : 0);

  table.push({ number: v.number, kind, rate, rows: rows.length, totalW, stored, before, afterA, afterB,
    annulled: v.annulled, deleted: v.deleted });
}

console.log("=== ПО ВЕДОМОСТЯМ ===");
console.log(pad("Ведомость", 11) + pad("тип", 11) + rpad("ставка", 8) + rpad("вес", 9) +
  rpad("ХРАНИМОЕ", 12) + rpad("ДО (отчёт)", 13) + rpad("ПОСЛЕ A", 11) + rpad("ПОСЛЕ B", 11));
for (const t of table) {
  console.log(pad(t.number, 11) + pad(t.kind, 11) + rpad(t.rate, 8) + rpad(t.totalW, 9) +
    rpad(t.stored.toLocaleString(), 12) + rpad(t.before.toLocaleString(), 13) +
    rpad(t.afterA.toLocaleString(), 11) + rpad(t.afterB.toLocaleString(), 11) +
    (t.before !== t.afterA ? "  ←изменится" : ""));
}

const sum = (f) => table.reduce((a, t) => a + t[f], 0);
console.log("\n" + pad("ИТОГО", 22) + rpad("", 8) + rpad("", 9) +
  rpad(sum("stored").toLocaleString(), 12) + rpad(sum("before").toLocaleString(), 13) +
  rpad(sum("afterA").toLocaleString(), 11) + rpad(sum("afterB").toLocaleString(), 11));

console.log("\n=== СОГЛАСОВАННОСТЬ: совпадает ли ДО с хранимой колонкой ===");
for (const t of table) {
  const diff = Math.round((t.before - t.stored) * 100) / 100;
  console.log(`  ${pad(t.number, 11)} ${pad(t.kind, 9)} хранимое=${rpad(t.stored.toLocaleString(), 12)} отчёт=${rpad(t.before.toLocaleString(), 12)} ${diff === 0 ? "совпадает" : `РАСХОДИТСЯ на ${diff.toLocaleString()}`}`);
}

console.log("\n=== ЗАТРОНУТЫЕ ПАРТИИ (детально, только там где меняется) ===");
for (const v of veds) {
  const s = j(v.data);
  const rows = Array.isArray(s.rows) ? s.rows : [];
  if (classify(s) === "новая") continue;
  for (const r of rows) {
    const b = batches.find(x => x.id === r.batchId);
    const beforeRow = payoutsFromRow({ ...r, _snapshot: s }).representativeSum;
    if (beforeRow === 0) continue;
    let ids = []; try { ids = JSON.parse(b?.requestIds || "[]"); } catch {}
    const alive = ids.map(id => requests.find(x => x.id === id)).filter(x => x && x.status !== "canceled");
    console.log(`  ${v.number} / партия ${pad(r.number, 10)} город=${pad(r.city, 12)} вес=${rpad(r.weight, 7)}` +
      ` накладных=${alive.length} архив=${b?.status === "reported" ? "ДА" : "нет"}` +
      ` → было ${beforeRow.toLocaleString()} тг, станет 0`);
  }
}

console.log("\n=== ПРОВЕРКА: НОВЫЕ ВЕДОМОСТИ НЕ МЕНЯЮТСЯ ===");
const newOnes = table.filter(t => t.kind === "новая");
const moved = newOnes.filter(t => t.before !== t.afterA);
console.log(`  Новых ведомостей: ${newOnes.length}. Изменившихся: ${moved.length} ${moved.length === 0 ? "✓" : "✗ " + moved.map(t => t.number).join(", ")}`);

console.log("\n=== БАГ (в): ВЕС В СНАПШОТЕ = 0 ПРИ НЕНУЛЕВЫХ НАКЛАДНЫХ ===");
let raceCount = 0;
for (const v of veds) {
  const s = j(v.data);
  for (const r of (Array.isArray(s.rows) ? s.rows : [])) {
    const b = batches.find(x => x.id === r.batchId);
    if (!b) continue;
    let ids = []; try { ids = JSON.parse(b.requestIds || "[]"); } catch {}
    const alive = ids.map(id => requests.find(x => x.id === id)).filter(x => x && x.status !== "canceled");
    const fact = alive.reduce((a, x) => a + n(j(x.details).totals?.weight), 0);
    const snapW = n(r.weight);
    if (snapW === 0 && fact > 0) {
      raceCount++;
      console.log(`  ${v.number} / партия ${pad(r.number, 10)} снапшот=0 факт=${fact} кг` +
        ` → перевозчику ${n(r.carrierSum)}, грузчикам ${n(r.loaderSum)}, представителю ${n(r.representativeSum)}`);
    }
  }
}
console.log(`  Всего партий с нулевым весом при реальном грузе: ${raceCount}`);

await prisma.$disconnect();
