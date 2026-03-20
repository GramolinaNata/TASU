import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function dump() {
  console.log('Fetching current data from DB...');
  
  const companies = await prisma.company.findMany();
  const users = await prisma.user.findMany();
  const counterparties = await prisma.counterparty.findMany();
  const requests = await prisma.request.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  const data = {
    companies,
    users,
    counterparties,
    requests
  };

  const filePath = path.join(__dirname, '../data_backup.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  
  console.log(`Successfully dumped ${companies.length} companies, ${users.length} users, ${counterparties.length} counterparties and ${requests.length} requests to ${filePath}`);
}

dump()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
