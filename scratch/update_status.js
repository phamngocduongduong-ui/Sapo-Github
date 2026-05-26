const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.order.updateMany({
    where: { status: "Chờ kế hoạch sản xuất" },
    data: { status: "Chờ kế hoạch" }
  });
  console.log("Updated records count:", result.count);
}

main()
  .catch((e) => {
    console.error("Error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
