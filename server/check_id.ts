import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkId() {
  const id = '0e96eb9d-ed18-4f23-a869-869ef0781228';
  console.log(`Checking database for ID: ${id}`);
  
  const req = await prisma.request.findUnique({
    where: { id },
    include: { company: true }
  });
  
  if (req) {
    console.log('✅ Found request:', JSON.stringify(req, null, 2));
  } else {
    console.log('❌ Request not found.');
    // List some recent IDs to see what we have
    const recents = await prisma.request.findMany({
      take: 5,
      select: { id: true, docNumber: true }
    });
    console.log('Recent IDs in DB:', JSON.stringify(recents, null, 2));
  }
  
  await prisma.$disconnect();
}

checkId().catch(e => {
  console.error(e);
  process.exit(1);
});
