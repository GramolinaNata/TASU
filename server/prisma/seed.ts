import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_COMPANIES = [
  {
    id: "tasu_kaz",
    name: 'ТОО "TASU KAZAKHSTAN"',
    bin: "240140034889",
    address: "Талгарский район, Бесагаш, ул. Латиф Хамиди, дом 64А",
    bankDetails: 'АО "Kaspi Bank", KZ15722S000034046863, CASPKZKA, кбе 17',
    director: "Төлеубек А.Т.",
    email: "info@tasu.kz",
    managerDetails: "+7 701 123 4567"
  },
  {
    id: "aldiyar",
    name: "ИП Алдияр",
    bin: "860702400843",
    address: "г. Алматы, ул. Закарпатская, дом 42",
    bankDetails: 'АО "Kaspi Bank", KZ60722S000016847953, CASPKZKA, кбе 19',
    director: "Мынбаев А.М.",
    email: "aldiyar@tasu.kz",
    managerDetails: "+7 702 987 6543"
  },
  {
    id: "tasu_kz",
    name: "ИП TASU KZ",
    bin: "600507400276",
    address: "Талгарский район, Бесагаш, ул. Латиф Хамиди, дом 64А",
    bankDetails: 'АО "Kaspi Bank", KZ95722S000037232940, CASPKZKA, кбе 19',
    director: "Төлеубек А.",
    email: "tasukz@tasu.kz",
    managerDetails: "+7 707 555 4433"
  }
];

async function main() {
  console.log('Начинаем сидирование базы данных...');

  // 1. Создаем админа и тестового менеджера
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tasu.kz' },
    update: {},
    create: {
      email: 'admin@tasu.kz',
      name: 'Главный Администратор',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  const managerPassword = await bcrypt.hash('manager123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@tasu.kz' },
    update: {},
    create: {
      email: 'manager@tasu.kz',
      name: 'Тестовый Менеджер',
      password: managerPassword,
      role: 'MANAGER',
    },
  });

  console.log('Пользователи проверены/созданы:', admin.email, manager.email);
  console.log('---');

  // 2. Создаем компании
  for (const comp of DEFAULT_COMPANIES) {
    try {
      console.log(`Обработка компании: ${comp.name} (BIN: ${comp.bin})...`);
      await prisma.company.upsert({
        where: { bin: comp.bin }, // bin - unique
        update: {
          name: comp.name,
          address: comp.address,
          bankDetails: comp.bankDetails,
          director: comp.director,
          email: comp.email,
          managerDetails: comp.managerDetails,
        },
        create: {
          id: comp.id,
          name: comp.name,
          bin: comp.bin,
          address: comp.address,
          bankDetails: comp.bankDetails,
          director: comp.director,
          email: comp.email,
          managerDetails: comp.managerDetails,
        },
      });
    } catch (err) {
      console.error(`Ошибка при добавлении компании ${comp.name}:`, err);
      throw err;
    }
  }
  
  console.log('Компании успешно добавлены в базу данных!');
}

main()
  .catch((e) => {
    console.error('КРИТИЧЕСКАЯ ОШИБКА СИДИРОВАНИЯ:');
    console.error(e);
    console.log('\nПодсказка: Если вы видите ошибку "EPERM" или "database is locked", попробуйте остановить сервер (npm run dev) перед запуском сида.');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
