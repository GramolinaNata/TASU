// ============================================================
// Разбор накладных, которым курьер затёр РАБОЧИЙ статус.
//
// Курьер писал «Забрано»/«Доставлено» в то же поле status, что и цепочка
// накладной. Такая накладная выпадает из своей вкладки, и завершить её нельзя.
// Код это уже не повторит (курьер пишет в cargoStatus), но записи остались.
//
// Что делает: возвращает рабочий статус и переносит движение груза в
// cargoStatus, ничего не теряя.
//
// По умолчанию DRY-RUN. Запись — только с --apply.
//   node scripts/fix-courier-status.mjs
//   node scripts/fix-courier-status.mjs --apply
// ============================================================
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();
const j = (r) => { if (!r) return {}; if (typeof r === "object") return r; try { return JSON.parse(r) || {}; } catch { return {}; } };
const pad = (v, w) => String(v).padEnd(w);

// Курьерский статус → шаг цепочки груза.
const TO_CARGO = { "Забрано": "picked_up", "Доставлено": "delivered" };

// Куда вернуть рабочий статус. «Подано» — консервативный выбор: накладная
// физически уехала (курьер её касался), но обработку менеджер не подтверждал.
// Ставить «Обработанные» нельзя: это отметка человека, а не наша догадка.
const RESTORE_TO = "sent";

const all = await prisma.request.findMany();
const broken = all.filter(r => Object.prototype.hasOwnProperty.call(TO_CARGO, String(r.status || "")));

console.log(`Режим: ${APPLY ? "ЗАПИСЬ (--apply)" : "DRY-RUN, ничего не меняется"}`);
console.log(`Накладных со статусом курьера: ${broken.length}\n`);

if (broken.length === 0) {
  console.log("Нечего чинить.");
  await prisma.$disconnect();
  process.exit(0);
}

console.log("=== ЧТО БУДЕТ СДЕЛАНО ===");
for (const r of broken) {
  const d = j(r.details);
  const cargo = TO_CARGO[String(r.status)];
  const already = String(r.cargoStatus || "");
  console.log(
    `  №${pad(d.docNumber || r.docNumber, 12)} ${pad(r.type, 8)}` +
    ` status: «${pad(r.status, 12)}» → «${RESTORE_TO}»` +
    `   cargoStatus: «${pad(already || "—", 12)}» → «${cargo}»` +
    (already && already !== cargo ? "  ⚠ УЖЕ БЫЛ ДРУГОЙ — перезапишем" : "")
  );
}

console.log("\n=== ПРОВЕРКА: не заденем ли что-то ещё ===");
const withCargo = broken.filter(r => r.cargoStatus && r.cargoStatus !== TO_CARGO[String(r.status)]);
console.log(`  У скольких уже стоит ДРУГОЙ cargoStatus: ${withCargo.length}`);
const paid = broken.filter(r => r.isPaid);
console.log(`  Из них уже завершённых (isPaid): ${paid.length}` + (paid.length ? " — их статус не трогаем" : ""));

if (!APPLY) {
  console.log("\nDRY-RUN: ничего не записано. Для записи — флаг --apply");
} else {
  let done = 0;
  for (const r of broken) {
    // Завершённую не трогаем: её цепочка уже отработана, менять статус задним
    // числом опаснее, чем оставить как есть.
    if (r.isPaid) continue;
    await prisma.request.update({
      where: { id: r.id },
      data: { status: RESTORE_TO, cargoStatus: TO_CARGO[String(r.status)] },
    });
    done++;
  }
  console.log(`\nОбновлено: ${done} из ${broken.length}`);
}

await prisma.$disconnect();
