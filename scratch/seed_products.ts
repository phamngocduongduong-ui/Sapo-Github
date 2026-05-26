import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding units...");
  const unitsData = [
    { code: "MT", name: "Tấn (MT)", status: "Hoạt động", note: "Metric Ton" },
    { code: "COIL", name: "Cuộn (Coil)", status: "Hoạt động", note: "Steel Coil" },
    { code: "PCS", name: "Cái (Pcs)", status: "Hoạt động", note: "Pieces" },
    { code: "BAG", name: "Bao (Bag)", status: "Hoạt động", note: "Packaging bag" },
  ];

  for (const u of unitsData) {
    await prisma.unit.upsert({
      where: { code: u.code },
      update: { status: "Hoạt động" },
      create: {
        id: u.code,
        code: u.code,
        name: u.name,
        status: u.status,
        note: u.note,
      },
    });
  }

  console.log("Seeding product categories...");
  const cat = await prisma.productcategory.upsert({
    where: { code: "STEEL" },
    update: {},
    create: {
      id: "STEEL",
      code: "STEEL",
      name: "Thép Thành Phẩm",
      status: "Hoạt động",
    },
  });

  console.log("Seeding products with English names...");
  const productsData = [
    {
      code: "HRC-001",
      name: "Thép cuộn cán nóng (HRC)",
      englishName: "Hot Rolled Steel Coil (HRC)",
      categoryId: cat.id,
      unitCodes: ["COIL", "MT"],
    },
    {
      code: "CRC-002",
      name: "Thép cuộn cán nguội (CRC)",
      englishName: "Cold Rolled Steel Coil (CRC)",
      categoryId: cat.id,
      unitCodes: ["COIL", "MT"],
    },
    {
      code: "GI-003",
      name: "Tôn mạ kẽm (GI)",
      englishName: "Galvanized Steel Sheet in Coil (GI)",
      categoryId: cat.id,
      unitCodes: ["COIL", "MT"],
    },
    {
      code: "PPGI-004",
      name: "Tôn mạ màu (PPGI)",
      englishName: "Prepainted Galvanized Steel Coil (PPGI)",
      categoryId: cat.id,
      unitCodes: ["COIL", "MT"],
    },
  ];

  for (const p of productsData) {
    await prisma.product.upsert({
      where: { code: p.code },
      update: {
        englishName: p.englishName,
        name: p.name,
      },
      create: {
        code: p.code,
        name: p.name,
        englishName: p.englishName,
        categoryId: p.categoryId,
        status: "Hoạt động",
        unit: {
          connect: p.unitCodes.map((code) => ({ code })),
        },
      },
    });
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
