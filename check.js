const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.request.findFirst({where:{type:'SIMPLE'},orderBy:{createdAt:'desc'}}).then(r => {
  console.log(JSON.stringify(r, null, 2));
  p.$disconnect();
});