const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe("ALTER TABLE customer ADD COLUMN status VARCHAR(50) DEFAULT 'Hoạt động' AFTER address");
    console.log("Status column added successfully");
  } catch (error) {
    console.log("Status column might already exist or error occurred:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
