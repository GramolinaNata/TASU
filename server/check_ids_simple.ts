import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkIds() {
  const targetId = '0e96eb9d-ed18-4f23-a869-869ef0781228';
  console.log(`Checking for Target ID: ${targetId}`);
  
  const allActs = await prisma.request.findMany({
    take: 20,
    select: { id: true, docNumber: true, status: true }
  });
  
  console.log('Available Acts in DB (up to 20):');
  console.log(JSON.stringify(allActs, null, 2));
  
  const found = allActs.find(a => a.id === targetId);
  if (found) {
    console.log('✅ Target ID EXISTS in DB');
  } else {
    console.log('❌ Target ID NOT FOUND in DB');
  }
  
  await prisma.$disconnect();
}

checkIds().catch(console.error);
