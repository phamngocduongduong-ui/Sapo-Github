import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const logs = await (prisma as any).auditlog.findMany({
    where: { tableName: "PurchaseInvoice" },
    orderBy: { createdAt: "desc" },
    take: 10
  });
  console.log('Last 10 PurchaseInvoice logs:', JSON.stringify(logs, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
