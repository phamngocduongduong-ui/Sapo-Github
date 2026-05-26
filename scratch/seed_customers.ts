import { PrismaClient } from '@prisma/client'
import crypto from "crypto";

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding customers...");
  try {
    const existing = await prisma.customer.findFirst({
      where: { code: "1001" }
    });

    if (!existing) {
      await (prisma as any).customer.create({
        data: {
          id: crypto.randomUUID(),
          code: "1001",
          name: "Công ty Cổ phần Thép Việt Nam",
          abbreviation: "VNSTEEL",
          classification: "Trong nước",
          country: "Việt Nam",
          phone: "02438686868",
          email: "contact@vnsteel.vn",
          address: "Số 91 Láng Hạ, Đống Đa, Hà Nội",
          status: "Hoạt động"
        }
      });
      console.log("Seeded customer VNSTEEL");
    }

    const existing2 = await prisma.customer.findFirst({
      where: { code: "0001" }
    });

    if (!existing2) {
      await (prisma as any).customer.create({
        data: {
          id: crypto.randomUUID(),
          code: "0001",
          name: "Singapore Steel Trading Pte Ltd",
          abbreviation: "SST",
          classification: "Quốc tế",
          country: "Singapore",
          phone: "+65 6789 0123",
          email: "sales@sgsteel.com",
          address: "10 Anson Road, International Plaza, Singapore",
          status: "Hoạt động"
        }
      });
      console.log("Seeded customer Singapore Steel Trading");
    }
    
  } catch (err) {
    console.error("Error seeding customers:", err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
