import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up Purchase Order and Purchase Invoice data...');
  
  // The order matters if there are no cascades, but we have cascades.
  // However, to be safe and thorough:
  
  const deletedDetails = await prisma.purchaseorderdetail.deleteMany({});
  console.log(`Deleted ${deletedDetails.count} purchase order details.`);
  
  const deletedPOs = await prisma.purchaseorder.deleteMany({});
  console.log(`Deleted ${deletedPOs.count} purchase orders.`);
  
  const deletedInvDetails = await prisma.purchaseinvoicedetail.deleteMany({});
  console.log(`Deleted ${deletedInvDetails.count} purchase invoice details.`);
  
  const deletedInvoices = await prisma.purchaseinvoice.deleteMany({});
  console.log(`Deleted ${deletedInvoices.count} purchase invoices.`);

  console.log('Cleanup complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
