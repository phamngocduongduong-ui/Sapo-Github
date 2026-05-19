import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const stocks = await prisma.finishedgoodsstock.findMany({
    include: {
      location: true
    }
  });
  console.log(JSON.stringify(stocks, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
