const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Clear any existing test orders to make sure we have clean data
  // But let's check DH01 first
  const existingDH01 = await prisma.order.findUnique({ where: { orderCode: 'DH01' } });
  if (existingDH01) {
    // Delete items first to avoid foreign key violations
    await prisma.orderitem.deleteMany({ where: { orderId: existingDH01.id } });
    await prisma.order.delete({ where: { id: existingDH01.id } });
  }
  
  const existingDH02 = await prisma.order.findUnique({ where: { orderCode: 'DH02' } });
  if (existingDH02) {
    await prisma.orderitem.deleteMany({ where: { orderId: existingDH02.id } });
    await prisma.order.delete({ where: { id: existingDH02.id } });
  }

  const existingDH03 = await prisma.order.findUnique({ where: { orderCode: 'DH03' } });
  if (existingDH03) {
    await prisma.orderitem.deleteMany({ where: { orderId: existingDH03.id } });
    await prisma.order.delete({ where: { id: existingDH03.id } });
  }

  console.log("Cleared old test orders. Inserting new test orders...");

  // Today's date
  const today = new Date();
  
  // 1. Order DH01: Chờ tiếp nhận
  const o1 = await prisma.order.create({
    data: {
      id: "test-id-dh01",
      orderCode: "DH01",
      customerCode: "1001",
      employeeName: "Phạm Ngọc Dương",
      orderDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2),
      branch: "Hồ Chí Minh",
      requestDeliveryDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5),
      thermometer: true,
      status: "Chờ tiếp nhận",
      note: "Đơn hàng test trạng thái Chờ tiếp nhận",
      orderitem: {
        create: [
          {
            id: "test-item-dh01-1",
            productName: "Xoài keo 20x20mm đông lạnh (1kg/túi x 10 túi/thùng)",
            packaging: "Túi 1kg, 10 túi/thùng",
            quantity: 1500,
            hasPallet: true,
            hasCornerGuard: true,
            note: "Yêu cầu xếp pallet cẩn thận"
          },
          {
            id: "test-item-dh01-2",
            productName: "Chuối 20mm đông lạnh (1kg/túi x 10 túi/thùng)",
            packaging: "Túi 1kg, 10 túi/thùng",
            quantity: 800,
            hasPallet: false,
            hasCornerGuard: false,
            note: "Không cần nẹp góc"
          }
        ]
      }
    }
  });
  console.log("Created DH01 (Chờ tiếp nhận):", o1.orderCode);

  // 2. Order DH02: Chờ kế hoạch sản xuất
  const o2 = await prisma.order.create({
    data: {
      id: "test-id-dh02",
      orderCode: "DH02",
      customerCode: "COC",
      employeeName: "Trần Thị Ánh Xuân",
      orderDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
      branch: "Đồng Tháp",
      requestDeliveryDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7),
      thermometer: false,
      status: "Chờ kế hoạch sản xuất",
      note: "Đơn hàng test trạng thái Chờ kế hoạch sản xuất",
      orderitem: {
        create: [
          {
            id: "test-item-dh02-1",
            productName: "Xoài cát chu 20x20mm đông lạnh (10kg/thùng)",
            packaging: "Thùng 10kg",
            quantity: 3000,
            hasPallet: true,
            hasCornerGuard: true,
            note: "Giao hàng buổi sáng"
          }
        ]
      }
    }
  });
  console.log("Created DH02 (Chờ kế hoạch sản xuất):", o2.orderCode);

  // 3. Order DH03: Chờ giao hàng (Scheduled for today)
  const o3 = await prisma.order.create({
    data: {
      id: "test-id-dh03",
      orderCode: "DH03",
      customerCode: "SOM",
      employeeName: "Mai Thị Thùy Luân",
      orderDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3),
      branch: "Đắk Lắk",
      requestDeliveryDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4),
      shipDate: today,
      thermometer: true,
      status: "Chờ giao hàng",
      note: "Đơn hàng test trạng thái Chờ giao hàng và xếp lịch hôm nay",
      orderitem: {
        create: [
          {
            id: "test-item-dh03-1",
            productName: "Đu đủ 20x20mm đông lạnh (1kg/túi x 10 túi/thùng",
            packaging: "Túi 1kg, 10 túi/thùng",
            quantity: 1200,
            hasPallet: true,
            hasCornerGuard: false,
            note: "Sử dụng nhiệt kế ghi hành trình"
          }
        ]
      }
    }
  });
  console.log("Created DH03 (Chờ giao hàng, Scheduled today):", o3.orderCode);
}

main()
  .catch((e) => {
    console.error("Error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
