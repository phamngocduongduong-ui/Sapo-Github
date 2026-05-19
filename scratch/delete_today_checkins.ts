import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const today = new Date("2026-05-18");
  today.setHours(0, 0, 0, 0);
  
  console.log(`Locating check-in records on date: ${today.toISOString()}`);
  
  const records = await prisma.checkin.findMany({
    where: {
      date: today
    }
  });
  
  console.log(`Found ${records.length} records for today.`);
  
  if (records.length > 0) {
    const result = await prisma.checkin.deleteMany({
      where: {
        date: today
      }
    });
    console.log(`Successfully deleted ${result.count} check-in records from the local database.`);
  } else {
    console.log("No check-in records found in the database for today.");
  }
}

main()
  .catch((e) => {
    console.error("Database operation failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
