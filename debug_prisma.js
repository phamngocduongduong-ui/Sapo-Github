const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contracts = await prisma.contract.findMany({
    select: { status: true, contractNumber: true }
  });
  const statuses = Array.from(new Set(contracts.map(c => c.status)));
  console.log("Distinct contract statuses in database:", statuses);
  console.log("Contracts:", contracts);
}

main()
  .catch((e) => {
    console.error("Error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
