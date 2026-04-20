const {PrismaClient} = require('@prisma/client');
process.env.DATABASE_URL = 'postgresql://postgres:cmupgaSaRsSsSurrSNvtiLXibQDUYqJX@shinkansen.proxy.rlwy.net:42194/railway';
const p = new PrismaClient();
async function main() {
  await p.company.createMany({
    data: [
      {id:'tasu_kz', name:'ИП TASU KZ', bin:'123456789012', address:'Астана, Закарпатская 42'},
      {id:'aldiyar', name:'ИП Алдияр', bin:'987654321098', address:'Алматы'},
    ],
    skipDuplicates: true
  });
  console.log('done');
  await p.$disconnect();
}
main();