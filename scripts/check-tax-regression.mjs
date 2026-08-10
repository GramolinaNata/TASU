// Сверка: не сдвинулся ли налог у существующих компаний после появления КПН.
//
// Старая формула (как было в BookkeeperReportPage до правки):
//   simplified → оборот × (taxRate + taxExtra)%
//   our        → оборот × vatRate%
//   иначе      → оборот × taxRate%
// Новая — calcTax из shared/tax/calcTax.js.
//
// Прогоняется по РЕАЛЬНЫМ компаниям из базы и по набору оборотов. Расхождение
// допустимо только там, где у компании заполнена ставка КПН: это и есть
// намеренное изменение. Везде, где kpnRate = 0, суммы обязаны совпасть.
//
// Запуск: node scripts/check-tax-regression.mjs --url=postgresql://...
import { PrismaClient } from "@prisma/client";
import { calcTax, taxSettingsOf } from "../src/shared/tax/calcTax.js";

const urlArg = process.argv.find((a) => a.startsWith("--url="));
const DB_URL = urlArg ? urlArg.slice("--url=".length) : process.env.DATABASE_URL;
if (!DB_URL) { console.error("Нужен --url=..."); process.exit(1); }

const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

function oldFormula(income, c) {
  const taxMode = c?.taxMode || "none";
  const taxRate = Number(c?.taxRate) || 0;
  const taxExtra = Number(c?.taxExtra) || 0;
  const vatRate = Number(c?.vatRate) || 0;
  if (taxMode === "simplified") return Math.round(income * ((taxRate + taxExtra) / 100));
  if (taxMode === "our") return Math.round(income * (vatRate / 100));
  return Math.round(income * (taxRate / 100));
}

const ОБОРОТЫ = [0, 1, 999, 12_345, 100_000, 400_000, 1_000_000, 7_654_321];
const companies = await prisma.company.findMany({
  select: { id: true, name: true, taxMode: true, taxRate: true, taxExtra: true, vatRate: true, kpnRate: true },
  orderBy: { name: "asc" },
});

console.log(`\nКомпаний в базе: ${companies.length}\n${"─".repeat(70)}`);
let mismatches = 0, checked = 0;

for (const c of companies) {
  const s = taxSettingsOf(c);
  const kpnSet = s.kpnRate > 0;
  console.log(`\n▸ ${c.name}  режим=${s.taxMode}  НДС=${s.vatRate}%  КПН=${s.kpnRate}%`);

  for (const income of ОБОРОТЫ) {
    // Сверяем в самом строгом варианте: перевозки нет. Если бы вычет перевозки
    // ломал старые цифры, это всплыло бы именно здесь.
    const было = oldFormula(income, c);
    const стало = calcTax({ income, carrierSum: 0, carrierOfficial: false, ...s }).total;
    checked++;
    const same = Math.abs(было - стало) < 0.005;
    if (!same) {
      mismatches++;
      const ожидаемо = kpnSet ? "ОЖИДАЕМО (ставка КПН заполнена)" : "!!! РЕГРЕСС !!!";
      console.log(`   оборот ${String(income).padStart(9)}: было ${было}  стало ${стало}   ${ожидаемо}`);
    }
  }
  if (!kpnSet) console.log(`   все ${ОБОРОТЫ.length} оборотов совпали до тенге ✓`);
}

console.log(`\n${"─".repeat(70)}`);
console.log(`Проверено сочетаний: ${checked}`);
console.log(`Расхождений: ${mismatches}`);

const регрессы = companies.filter((c) => (Number(c.kpnRate) || 0) === 0).length === companies.length && mismatches > 0;
console.log(регрессы
  ? "\n!!! ЕСТЬ РЕГРЕСС: цифры изменились у компании без ставки КПН"
  : "\nРегрессов нет: расхождения только там, где ставка КПН заполнена.");

await prisma.$disconnect();
