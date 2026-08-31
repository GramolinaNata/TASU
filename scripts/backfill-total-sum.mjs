// ============================================================
// Перенос суммы из details.totalSum в колонку Request.totalSum.
//
// ЗАЧЕМ. Сумма накладной живёт в двух местах: колонка Request.totalSum и поле
// details.totalSum внутри JSON. У части старых частных накладных колонка
// ПУСТАЯ, а сумма есть только в details. Списки, читавшие голую колонку,
// показывали «—», хотя в карточке сумма была.
//
// Код теперь читает оба места через src/shared/acts/actSum.js, поэтому суммы
// видны и БЕЗ этого скрипта. Скрипт нужен для другого: чтобы данные перестали
// быть кривыми — на колонке стоят сортировка в SQL (ALLOWED_SORT в
// request.controller) и любые будущие отчёты, которые полезут в базу напрямую
// и про details знать не будут.
//
// ЧТО ДЕЛАЕТ: только ЗАПОЛНЯЕТ пустую колонку значением из details.
// Ничего не перезаписывает и не удаляет. Если колонка уже заполнена — запись
// не трогается, даже если в details лежит другое число: колонка главнее, и
// разбираться с расхождением вслепую скриптом нельзя.
//
// ЗАПУСК:
//   node scripts/backfill-total-sum.mjs                 # разбор без записи
//   node scripts/backfill-total-sum.mjs --apply         # записать
//   node scripts/backfill-total-sum.mjs --apply --all   # включая юрлиц
//
// БАЗА берётся из DATABASE_URL. Пароль в скрипт не зашит — в отличие от
// push_railway.js, откуда он утёк в репозиторий:
//   DATABASE_URL="postgresql://..." node scripts/backfill-total-sum.mjs
// ============================================================

import { PrismaClient } from '@prisma/client';

const APPLY = process.argv.includes('--apply');
const ALL = process.argv.includes('--all');

if (!process.env.DATABASE_URL) {
  console.error('Не задан DATABASE_URL. Пример:');
  console.error('  DATABASE_URL="postgresql://user:pass@host:port/db" node scripts/backfill-total-sum.mjs');
  process.exit(1);
}

const prisma = new PrismaClient();

/** details — колонка String: приходит JSON-строкой. Мусор не должен ронять прогон. */
function parseDetails(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Пустая строка и «не число» — отсутствие суммы. Ноль — значение, но
 * переносить его незачем: колонка и так читается как «нет суммы», а запись
 * ради нуля только зашумит журнал изменений.
 */
function toSum(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (raw === '') return null;
  const n = Number(raw.replace(/\s+/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const isSimple = (r, d) => r.type === 'SIMPLE' || d.isSimple === true;

async function main() {
  const mode = APPLY ? 'ЗАПИСЬ' : 'РАЗБОР (--apply не указан, база не меняется)';
  console.log(`Режим: ${mode}`);
  console.log(`Охват: ${ALL ? 'все накладные' : 'только частные (--all — включить юрлиц)'}\n`);

  const rows = await prisma.request.findMany({
    select: { id: true, docNumber: true, type: true, status: true, totalSum: true, details: true },
    orderBy: { createdAt: 'asc' },
  });

  const plan = [];
  const skippedLegal = [];
  let alreadyFilled = 0;
  let nothingAnywhere = 0;

  for (const r of rows) {
    if (toSum(r.totalSum) !== null) { alreadyFilled++; continue; }

    const d = parseDetails(r.details);
    const fromDetails = toSum(d.totalSum);
    if (fromDetails === null || fromDetails === 0) { nothingAnywhere++; continue; }

    if (!ALL && !isSimple(r, d)) { skippedLegal.push(r); continue; }
    plan.push({ ...r, newSum: String(fromDetails) });
  }

  console.log(`Всего накладных:              ${rows.length}`);
  console.log(`Колонка уже заполнена:        ${alreadyFilled}`);
  console.log(`Суммы нет ни там, ни там:     ${nothingAnywhere}`);
  if (skippedLegal.length) {
    console.log(`Пропущено юрлиц (нужен --all): ${skippedLegal.length}`);
  }
  console.log(`К переносу:                   ${plan.length}\n`);

  if (plan.length === 0) {
    console.log('Переносить нечего.');
    return;
  }

  for (const p of plan) {
    console.log(`  №${String(p.docNumber || '—').padEnd(12)} ${String(p.type).padEnd(8)} ${String(p.status).padEnd(10)} details=${p.newSum} → колонка`);
  }

  if (!APPLY) {
    console.log('\nЭто разбор. Чтобы записать, повторите с --apply.');
    return;
  }

  let ok = 0;
  const failed = [];
  for (const p of plan) {
    try {
      // Условие в where — защита от гонки: если колонку успели заполнить
      // между разбором и записью, обновление не состоится, и это правильно.
      const res = await prisma.request.updateMany({
        where: { id: p.id, OR: [{ totalSum: '' }, { totalSum: null }] },
        data: { totalSum: p.newSum },
      });
      if (res.count === 1) ok++;
      else failed.push(`${p.docNumber || p.id}: колонку успели заполнить, пропущено`);
    } catch (e) {
      failed.push(`${p.docNumber || p.id}: ${e.message}`);
    }
  }

  console.log(`\nЗаписано: ${ok} из ${plan.length}`);
  if (failed.length) {
    console.log('Не записано:');
    failed.forEach((f) => console.log('  ' + f));
  }
}

main()
  .catch((e) => { console.error('Ошибка:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
