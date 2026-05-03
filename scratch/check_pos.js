const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const allPos = await prisma.purchaseorder.findMany();
  console.log('Total POs:', allPos.length);
  const statuses = allPos.reduce((acc, po) => {
    acc[po.status] = (acc[po.status] || 0) + 1;
    return acc;
  }, {});
  console.log('Statuses:', statuses);
  process.exit(0);
}

check();
