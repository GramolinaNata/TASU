const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
bcrypt.hash('admin123', 10).then(hash => prisma.user.create({data: {email: 'dev@test.com', password: hash, name: 'Dev', role: 'ADMIN'}})).then(u => { console.log('Created:', u.email); process.exit(0); });