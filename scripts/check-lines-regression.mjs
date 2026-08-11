// Проверка построчной разбивки на РЕАЛЬНЫХ тарифах из базы.
//
// Тесты движка гоняют инвариант на фикстурах. Здесь — на настоящих тарифах,
// со всеми их историческими форматами (_ranges / rN-dN / регионы / посёлки),
// потому что именно на них разбивка и будет работать у заказчика.
//
// Запуск: node scripts/check-lines-regression.mjs
import { PrismaClient } from "@prisma/client";
import { calcDeliveryPrice, getDeliveryDestinations } from "../src/shared/tariff/calcTariff.js";

const prisma = new PrismaClient();
const tariffs = await prisma.tariff.findMany();
console.log(`Тарифов в базе: ${tariffs.length}`);

let checked = 0, bad = 0, noLines = 0;
const combos = [];
for (const category of ["legal", "private"]) {
  for (const d of getDeliveryDestinations(tariffs, category)) {
    const city = typeof d === "string" ? d : d.city;
    for (const weightKg of [3, 25, 120]) {
      for (const withDelivery of [true, false]) {
        for (const withPickup of [true, false]) {
          combos.push({ category, city, weightKg, withDelivery, withPickup });
        }
      }
    }
  }
}

for (const c of combos) {
  const r = calcDeliveryPrice({
    tariffs, city: c.city, fromCity: "Алматы", weightKg: c.weightKg,
    category: c.category, withDelivery: c.withDelivery, withPickup: c.withPickup,
  });
  if (!r.ok) continue;
  checked++;
  if (!Array.isArray(r.lines) || !r.lines.length) { noLines++; continue; }
  const s = Math.round(r.lines.reduce((a, l) => a + l.amount, 0) * 100) / 100;
  if (s !== r.sum) {
    bad++;
    if (bad <= 5) console.log(`РАСХОЖДЕНИЕ ${c.category} ${c.city} ${c.weightKg}кг: строки ${s} ≠ итог ${r.sum}`);
  }
}

console.log(`Проверено сочетаний: ${checked}`);
console.log(`Расхождений «сумма строк ≠ итог»: ${bad}`);
console.log(`Без разбивки: ${noLines}`);

// Пример разбивки на реальном тарифе — глазами увидеть, как ляжет в накладную.
const d0 = getDeliveryDestinations(tariffs, "legal")[0];
const city = typeof d0 === "string" ? d0 : d0 && d0.city;
if (city) {
  const r = calcDeliveryPrice({
    tariffs, city, fromCity: "Алматы", weightKg: 25, category: "legal",
    withDelivery: true, withPickup: true, prrType: "manual", storageMode: "weight", storageDays: 2,
  });
  if (r.ok) {
    console.log(`\nПример — Алматы → ${city}, 25 кг:`);
    for (const l of r.lines) console.log(`  ${l.name.padEnd(46)} ${l.amount.toLocaleString("ru-RU")} тг`);
    console.log(`  ${"ИТОГО".padEnd(46)} ${r.sum.toLocaleString("ru-RU")} тг`);
  }
}

await prisma.$disconnect();
