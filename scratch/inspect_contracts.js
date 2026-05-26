const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const contract = await prisma.contract.findFirst({
    include: { contractitem: true }
  });
  console.log(JSON.stringify(contract, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());

