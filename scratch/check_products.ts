import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const products = await prisma.product.findMany({
    include: { unit: true }
  });
  console.log("Products count:", products.length);
  console.log("Products sample:", JSON.stringify(products.slice(0, 5), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
