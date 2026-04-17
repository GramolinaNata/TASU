const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
bcrypt.hash('tasu123', 10).then(hash => {
  prisma.user.create({
    data:{email:'buhgalter2@tasu.kz', password:hash, name:'Бухгалтер 2', role:'ACCOUNTANT2'}
  }).then(u => {
    console.log('created:', u.email);
    prisma.$disconnect();
  }).catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
});