import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Searching for duplicate docNumbers...');
  
  const requests = await prisma.request.findMany({
    where: {
      NOT: {
        docNumber: null
      }
    },
    select: {
      id: true,
      docNumber: true,
      createdAt: true
    }
  });

  const groups: Record<string, any[]> = {};
  requests.forEach(r => {
    const num = r.docNumber as string;
    if (!groups[num]) groups[num] = [];
    groups[num].push(r);
  });

  const duplicates = Object.entries(groups).filter(([_, list]) => list.length > 1);

  console.log(`Found ${duplicates.length} numbers with duplicates.`);

  for (const [docNumber, list] of duplicates) {
    console.log(`Handling duplicate: ${docNumber} (${list.length} occurrences)`);
    // Сортируем по дате создания, оставляем самый старый
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    const toDelete = list.slice(1);
    for (const r of toDelete) {
       console.log(`  Deleting duplicate instance: ${r.id}`);
       await prisma.request.delete({ where: { id: r.id } });
    }
  }

  console.log('Cleanup finished.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
