const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const companies = await prisma.company.findMany();
  console.log('Companies:', companies.map(c => c.id + ' - ' + c.name));
  const manager = await prisma.user.findUnique({ where: { email: 'manager@tasu.kz' } });
  console.log('Manager:', manager);
  process.exit(0);
}
main();