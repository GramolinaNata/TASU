import fs from 'fs';
import path from 'path';

const backupPath = path.join(__dirname, '../data_backup.json');
const seedPath = path.join(__dirname, '../prisma/seed.ts');

if (!fs.existsSync(backupPath)) {
  console.error('Backup file not found. Run dump_db.ts first.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

const seedFileContent = `import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DATA = ${JSON.stringify(data, null, 2)};

async function main() {
  console.log('Restoring database from saved state...');

  // 1. Companies
  for (const comp of DATA.companies) {
    console.log(\`Restoring company: \${comp.name}\`);
    await prisma.company.upsert({
      where: { bin: comp.bin },
      update: {
        name: comp.name,
        address: comp.address,
        factAddress: comp.factAddress || "",
        phone: comp.phone || "",
        director: comp.director || "",
        email: comp.email || "",
        bank: comp.bank || "",
        bik: comp.bik || "",
        account: comp.account || "",
        kbe: comp.kbe || "",
        bankDetails: comp.bankDetails || "",
        managerDetails: comp.managerDetails || "",
        logo: comp.logo
      },
      create: {
        id: comp.id,
        name: comp.name,
        bin: comp.bin,
        address: comp.address,
        factAddress: comp.factAddress || "",
        phone: comp.phone || "",
        director: comp.director || "",
        email: comp.email || "",
        bank: comp.bank || "",
        bik: comp.bik || "",
        account: comp.account || "",
        kbe: comp.kbe || "",
        bankDetails: comp.bankDetails || "",
        managerDetails: comp.managerDetails || "",
        logo: comp.logo
      }
    });
  }

  // 2. Users
  for (const user of DATA.users) {
    console.log(\`Restoring user: \${user.email}\`);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        password: user.password // Keep existing hashed password
      },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        password: user.password
      }
    });
  }

  // 3. Counterparties
  for (const cp of DATA.counterparties) {
    console.log(\`Restoring counterparty: \${cp.name}\`);
    await prisma.counterparty.upsert({
      where: { id: cp.id },
      update: {
        name: cp.name,
        phone: cp.phone,
        email: cp.email,
        companyName: cp.companyName,
        bin: cp.bin,
        address: cp.address,
        bank: cp.bank,
        bik: cp.bik,
        account: cp.account,
        kbe: cp.kbe,
        companyId: cp.companyId
      },
      create: {
        id: cp.id,
        name: cp.name,
        phone: cp.phone,
        email: cp.email,
        companyName: cp.companyName,
        bin: cp.bin,
        address: cp.address,
        bank: cp.bank,
        bik: cp.bik,
        account: cp.account,
        kbe: cp.kbe,
        companyId: cp.companyId
      }
    });
  }

  console.log('Database restoration complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

fs.writeFileSync(seedPath, seedFileContent);
console.log(`Successfully generated updated seed.ts at ${seedPath}`);
