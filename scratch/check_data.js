const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const data = await prisma.$queryRawUnsafe("SELECT * FROM customer LIMIT 1");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
