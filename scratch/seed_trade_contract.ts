import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log("Seeding trade contracts...");
  try {
    // Check if contract already exists
    const existing = await (prisma as any).contract.findUnique({
      where: { contractNumber: "HĐ-2026-TEST01" }
    });

    if (existing) {
      console.log("Contract already exists, deleting first...");
      await (prisma as any).contract.delete({
        where: { contractNumber: "HĐ-2026-TEST01" }
      });
    }

    const newContract = await (prisma as any).contract.create({
      data: {
        id: "mock-contract-id-1",
        contractNumber: "HĐ-2026-TEST01",
        contractDate: new Date("2026-05-19"),
        seller: "Công ty cổ phần Sapo",
        buyer: "Công ty thương mại ABC",
        deliveryDate: new Date("2026-06-01"),
        portOfLoading: "Cảng Cát Lái",
        portOfDischarge: "Port of Singapore",
        transshipment: "Không cho phép",
        partialShipment: "Cho phép",
        deliveryTerms: "FOB Ho Chi Minh Port",
        paymentMethod: "L/C at sight",
        paymentTerms: "30 days after BL",
        bank: "Vietcombank - 001100123456",
        accompanyingDocuments: "Commercial Invoice, Packing List, Bill of Lading, Certificate of Origin",
        expiryDate: new Date("2027-05-19"),
        status: "Tạo mới",
        note: "Hợp đồng thử nghiệm hệ thống",
        contractitem: {
          create: [
            {
              id: "mock-item-id-1",
              productName: "Thép tấm cuộn",
              packaging: "Cuộn",
              quantity: 150,
              note: "Loại A"
            },
            {
              id: "mock-item-id-2",
              productName: "Tôn kẽm mạ màu",
              packaging: "Tấm",
              quantity: 500,
              note: "Màu xanh dương"
            }
          ]
        }
      }
    });
    console.log("Trade contract seeded successfully:", newContract.contractNumber);
  } catch (err) {
    console.error("Error seeding trade contract:", err);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
