// ============================================================
// Засев журнала движения для груза, который ехал ДО появления журнала.
//
// ЗАЧЕМ. Колонка Request.cargoEvents добавлена позже самого движения груза.
// У накладной может стоять cargoStatus «погружен на фуру», а истории — ни
// строки: раньше писали только текущее значение и одну отметку времени, автор
// не сохранялся вообще. В кабинете операционного менеджера такой груз выглядел
// бы как никогда не забиравшийся.
//
// ЧТО ДЕЛАЕТ.
//   1. Приводит cargoStatus через карту старых значений (CARGO_LEGACY_MAP):
//      «Забрано» → picked_up, «Доставлено» → delivered. Такие значения писал
//      прямо в статус документа старый курьерский экран; если хоть одно
//      протекло в cargoStatus, оно должно читаться, а не считаться «не в пути».
//   2. Ставит ОДНУ запись журнала по текущему статусу, если журнал пуст.
//      Время — из cargoStatusAt (иначе updatedAt), автор пустой: тогда его
//      честно не записывали. Запись помечена seeded:true — «восстановлено, а
//      не зафиксировано в момент события».
//
// ЧЕГО НЕ ДЕЛАЕТ. Не додумывает пройденные шаги. Груз со статусом «выдан»
// получит одну запись «выдан», а не четыре выдуманные отметки с выдуманным
// временем: журнал должен отвечать за то, что было, а не за то, что «должно
// было быть». Не трогает накладные, у которых журнал уже есть.
//
// ИДЕМПОТЕНТЕН: повторный прогон ничего не добавляет.
//
// Запуск (внутри контейнера api — там лежит СОБРАННЫЙ код, src/ в образ
// не копируется, поэтому ts-node не подойдёт):
//   docker compose exec api node dist/scripts/backfill-cargo-events.js
// Сначала вхолостую, без записи, — так и надо начинать:
//   docker compose exec api node dist/scripts/backfill-cargo-events.js --dry
// ============================================================

import prisma from '../lib/prisma';

const CARGO_FLOW_KEYS = [
  'picked_up', 'wh_accepted', 'wh_released', 'courier_took',
  'loaded', 'in_transit', 'region_took', 'rep_received', 'delivered',
];

// ⚠️ ЗЕРКАЛО src/shared/cargo/cargoStatus.js (CARGO_LEGACY_MAP).
const CARGO_LEGACY_MAP: Record<string, string> = {
  picked_up: 'picked_up',
  loaded: 'loaded',
  rep_received: 'rep_received',
  delivered: 'delivered',
  'забрано': 'picked_up',
  'доставлено': 'delivered',
};

function normalizeCargo(value: any): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (CARGO_FLOW_KEYS.includes(raw)) return raw;
  return CARGO_LEGACY_MAP[raw] || CARGO_LEGACY_MAP[raw.toLowerCase()] || '';
}

function hasEvents(raw: any): boolean {
  if (Array.isArray(raw)) return raw.length > 0;
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) && p.length > 0;
    } catch {
      return false;
    }
  }
  return false;
}

async function main() {
  const dry = process.argv.includes('--dry');
  console.log(dry ? '── Пробный прогон, без записи ──' : '── Засев журнала движения ──');

  const rows = await prisma.request.findMany({
    select: { id: true, docNumber: true, cargoStatus: true, cargoStatusAt: true, cargoEvents: true, updatedAt: true } as any,
  });

  let seeded = 0;
  let normalized = 0;
  let skippedHasLog = 0;
  let skippedNoStatus = 0;
  let unknown = 0;

  for (const r of rows as any[]) {
    const raw = String(r.cargoStatus ?? '').trim();
    const status = normalizeCargo(raw);

    if (!status) {
      if (raw) {
        // Значение есть, но карта его не знает — трогать не будем, только скажем.
        unknown++;
        console.warn(`  ? ${r.docNumber || r.id}: незнакомый cargoStatus «${raw}» — оставлен как есть`);
      } else {
        skippedNoStatus++;
      }
      continue;
    }

    if (hasEvents(r.cargoEvents)) {
      skippedHasLog++;
      continue;
    }

    const at = (r.cargoStatusAt || r.updatedAt || new Date()).toISOString();
    const event = { status, at, byId: null, byName: '', byRole: '', back: false, seeded: true };

    const data: any = { cargoEvents: [event] };
    // Значение из старого формата заодно приводим к шагу маршрута — иначе оно
    // так и останется в базе строкой, которую понимает только карта.
    if (status !== raw) {
      data.cargoStatus = status;
      normalized++;
      console.log(`  → ${r.docNumber || r.id}: «${raw}» → ${status}`);
    }

    if (!dry) {
      await prisma.request.update({ where: { id: r.id }, data });
    }
    seeded++;
  }

  console.log('');
  console.log(`Всего накладных:            ${rows.length}`);
  console.log(`Журнал засеян:              ${seeded}`);
  console.log(`  из них статус приведён:   ${normalized}`);
  console.log(`Пропущено (журнал есть):    ${skippedHasLog}`);
  console.log(`Пропущено (груз не в пути): ${skippedNoStatus}`);
  if (unknown) console.log(`НЕ РАСПОЗНАНО:              ${unknown} — см. предупреждения выше`);
  if (dry) console.log('\nЭто был пробный прогон, база не менялась.');
}

main()
  .catch((e) => {
    console.error('backfill-cargo-events error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
