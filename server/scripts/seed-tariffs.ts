/**
 * Сид тарифов: upsert по полю `city` (уникальный ключ).
 * НЕ удаляет существующие тарифы — только вставляет новые и обновляет совпадающие.
 *
 * Запуск:
 *   DATABASE_URL="<prod>" npx ts-node --transpile-only scripts/seed-tariffs.ts
 *
 * Опции (env):
 *   SKIP_CITIES="Кантерлот,Новосиб,Нск__PRIVATE"  — пропустить перечисленные города
 *   DRY_RUN=1                                      — только показать, что будет сделано
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL не задан. Пример: DATABASE_URL="postgres://..." npx ts-node --transpile-only scripts/seed-tariffs.ts');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

const dataPath = path.join(__dirname, 'tariffs_data.json');
const tariffs: Array<any> = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const skip = new Set(
  (process.env.SKIP_CITIES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);
const dryRun = process.env.DRY_RUN === '1';

async function main() {
  // Скрываем хост в логе, чтобы не светить креды целиком
  const host = (() => { try { return new URL(url!).host; } catch { return '???'; } })();
  console.log(`🎯 Цель: ${host}`);
  console.log(`📦 Тарифов в файле: ${tariffs.length}${skip.size ? `, пропустить: ${[...skip].join(', ')}` : ''}`);
  if (dryRun) console.log('🧪 DRY_RUN — изменения НЕ применяются');

  let created = 0, updated = 0, skipped = 0;

  for (const t of tariffs) {
    if (skip.has(t.city)) { skipped++; continue; }

    const payload = {
      pricePerKg: Number(t.pricePerKg) || 0,
      deliveryPrice: Number(t.deliveryPrice) || 0,
      weightRanges: t.weightRanges ?? undefined,
      extraSum: Number(t.extraSum) || 0,
      isPrivate: !!t.isPrivate,
      companyId: t.companyId ?? null,
    };

    if (dryRun) {
      const exists = await prisma.tariff.findUnique({ where: { city: t.city } });
      console.log(`  ${exists ? '~ update' : '+ create'}  ${t.city}`);
      exists ? updated++ : created++;
      continue;
    }

    const before = await prisma.tariff.findUnique({ where: { city: t.city } });
    await prisma.tariff.upsert({
      where: { city: t.city },
      update: payload,
      create: { city: t.city, ...payload },
    });
    before ? updated++ : created++;
  }

  console.log(`✅ Готово. Создано: ${created}, обновлено: ${updated}, пропущено: ${skipped}`);
  const total = await prisma.tariff.count();
  console.log(`📊 Всего тарифов в целевой базе: ${total}`);
}

main()
  .catch((e) => { console.error('❌ Ошибка сида тарифов:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
