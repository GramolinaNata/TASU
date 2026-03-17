import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const companyId = 'tasu_kaz'; // ТОО "TASU KAZAKHSTAN"
  const managerId = 1; // Главный Администратор
  const date = new Date().toISOString();
  const docNumber = 'T000999'; // Safe unique number for testing

  const details = {
    docType: 'smr',
    route: {
      fromCity: 'Алматы',
      toCity: 'Астана',
      fromAddress: 'ул. Абая 10',
      toAddress: 'пр. Республики 25',
      distance: '1200 км'
    },
    cargo: {
      name: 'Оборудование для связи (серверы, кабели)',
      weight: '5000 кг',
      volume: '22 м3',
      quantity: '10 мест'
    },
    customer: {
      fio: 'Иванов Иван Иванович',
      phone: '+7 777 123 45 67',
      email: 'ivanov@example.com'
    },
    vehicle: {
      model: 'Volvo FH12',
      number: 'KZ 777 ABC 01',
      driverName: 'Петренко Сергей',
      driverPhone: '+7 701 555 33 22'
    },
    services: [
      { id: '1', name: 'Автоперевозка Алматы - Астана', qty: '1', sum: '450000' },
      { id: '2', name: 'Экспедирование', qty: '1', sum: '15000' },
      { id: '3', name: 'Страхование груза', qty: '1', sum: '5000' }
    ],
    total: {
      price: '470000'
    },
    docAttrs: {
      transportType: 'auto_console',
      vehicle: 'Volvo FH12',
      driver: 'Петренко Сергей',
      hasTrailer: true,
      trailerNumber: 'KZ 001 AA 01'
    }
  };

  const newRequest = await prisma.request.create({
    data: {
      status: 'smr',
      date: date,
      companyId: companyId,
      managerId: managerId,
      type: 'SMR',
      docNumber: docNumber,
      details: JSON.stringify(details),
      cargo: 'Оборудование для связи',
      route: 'Алматы - Астана'
    }
  });

  console.log(`Successfully created test request: ${newRequest.docNumber} (ID: ${newRequest.id})`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
