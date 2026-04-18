const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.request.deleteMany({where:{type:'SIMPLE'}}).then(r => {
  console.log('deleted:', r.count);
  p.$disconnect();
});