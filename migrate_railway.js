const {PrismaClient} = require('@prisma/client');
process.env.DATABASE_URL = 'postgresql://postgres:cmupgaSaRsSsSurrSNvtiLXibQDUYqJX@shinkansen.proxy.rlwy.net:42194/railway';
const p = new PrismaClient();
p.$executeRaw`SELECT 1`.then(() => {
  console.log('connected');
  return p.$disconnect();
});