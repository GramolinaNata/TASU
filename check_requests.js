const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.request.findMany({where:{type:'REQUEST'},take:3}).then(r => {
  console.log('count:', r.length);
  if(r[0]) console.log('first:', JSON.stringify(r[0], null, 2));
  p.$disconnect();
});