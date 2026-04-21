const {PrismaClient} = require('@prisma/client');
process.env.DATABASE_URL = 'postgresql://postgres:cmupgaSaRsSsSurrSNvtiLXibQDUYqJX@shinkansen.proxy.rlwy.net:42194/railway';
const p = new PrismaClient();
p.batch.findMany().then(r => {
  console.log('batches:', r.length);
  console.log(JSON.stringify(r, null, 2));
  p.$disconnect();
});