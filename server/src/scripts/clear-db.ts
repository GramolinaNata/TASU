import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Очистка базы данных ---');
  
  try {
    const deleted = await prisma.request.deleteMany({});
    console.log(`Успешно удалено заявок: ${deleted.count}`);
    console.log('Таблицы SMR, TTN и Склад очищены.');
  } catch (error) {
    console.error('Ошибка при очистке:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
