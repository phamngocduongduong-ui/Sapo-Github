const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const columns = await prisma.$queryRawUnsafe("SHOW COLUMNS FROM customer");
    console.log(JSON.stringify(columns, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
