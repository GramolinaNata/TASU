const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.request.count().then(r => { console.log('total:', r); p.$disconnect(); });