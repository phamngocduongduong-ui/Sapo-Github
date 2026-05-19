const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findFirst();
    console.log('Successfully connected to database!');
    console.log('Found user:', user ? user.username : 'No users found');
  } catch (error) {
    console.error('Failed to connect to database:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
