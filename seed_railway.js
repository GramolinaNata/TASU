const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcryptjs');
process.env.DATABASE_URL = 'postgresql://postgres:cmupgaSaRsSsSurrSNvtiLXibQDUYqJX@shinkansen.proxy.rlwy.net:42194/railway';
const p = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('tasu123', 10);
  await p.user.createMany({
    data: [
      {email:'admin@tasu.kz', password:hash, name:'Главный Администратор', role:'ADMIN'},
      {email:'manager@tasu.kz', password:hash, name:'Менеджер Абылай', role:'MANAGER'},
      {email:'buhgalter@tasu.kz', password:hash, name:'Бухгалтер Алмас', role:'ACCOUNTANT'},
      {email:'buhgalter2@tasu.kz', password:hash, name:'Бухгалтер 2', role:'ACCOUNTANT2'},
      {email:'courier@tasu.kz', password:hash, name:'Курьер Даурен', role:'COURIER'},
    ],
    skipDuplicates: true
  });
  console.log('done');
  await p.$disconnect();
}
main();