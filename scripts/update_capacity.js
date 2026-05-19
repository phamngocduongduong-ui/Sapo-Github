const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Updating capacity for existing locations...");
  
  const result = await prisma.finishedgoodslocation.updateMany({
    where: {
      OR: [
        { capacity: null },
        { capacity: 0 }
      ]
    },
    data: {
      capacity: 900
    }
  });
  
  console.log(`Updated ${result.count} locations.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
