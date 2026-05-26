const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    select: { id: true, orderCode: true, status: true, shipDate: true }
  });
  console.log("Total orders in database:", orders.length);
  const statusCounts = {};
  orders.forEach(o => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });
  console.log("Order status counts:", statusCounts);
  console.log("Detailed orders:", orders.map(o => ({
    code: o.orderCode,
    status: o.status,
    shipDate: o.shipDate
  })));
}

main()
  .catch((e) => {
    console.error("Error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
