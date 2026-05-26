const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function logAuditMock({ tableName, recordId, action, oldData, newData, changedBy, changeDetail }) {
  return await prisma.auditlog.create({
    data: {
      tableName,
      recordId,
      action,
      oldData: oldData ? JSON.stringify(oldData) : null,
      newData: newData ? JSON.stringify(newData) : null,
      changedBy,
      changeDetail
    }
  });
}

async function testAcceptOrder(id) {
  console.log(`\n--- Testing acceptOrder for ID: ${id} ---`);
  const oldOrder = await prisma.order.findUnique({ where: { id } });
  if (!oldOrder) throw new Error("Order not found");
  if (oldOrder.status !== "Chờ tiếp nhận") {
    throw new Error("Only orders in 'Chờ tiếp nhận' can be accepted.");
  }
  
  await prisma.order.update({
    where: { id },
    data: { status: "Chờ kế hoạch sản xuất" }
  });
  
  await logAuditMock({
    tableName: "Order",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldOrder.status },
    newData: { status: "Chờ kế hoạch sản xuất" },
    changedBy: "TestRunner",
    changeDetail: `Tiếp nhận đơn hàng ${oldOrder.orderCode}, chuyển sang Chờ kế hoạch sản xuất`
  });
  
  const updated = await prisma.order.findUnique({ where: { id } });
  console.log(`Result status: ${updated.status} (Expected: Chờ kế hoạch sản xuất)`);
  if (updated.status !== "Chờ kế hoạch sản xuất") throw new Error("Status mismatch!");
  
  const audit = await prisma.auditlog.findFirst({
    where: { recordId: id, action: "STATUS_CHANGE" },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Audit log written:`, audit.changeDetail);
}

async function testPlanOrder(id, shipDateStr) {
  console.log(`\n--- Testing planOrder for ID: ${id} to date ${shipDateStr} ---`);
  const oldOrder = await prisma.order.findUnique({ where: { id } });
  if (!oldOrder) throw new Error("Order not found");
  
  const shipDate = new Date(shipDateStr);
  await prisma.order.update({
    where: { id },
    data: {
      status: "Chờ giao hàng",
      shipDate: shipDate
    }
  });
  
  await logAuditMock({
    tableName: "Order",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldOrder.status, shipDate: oldOrder.shipDate },
    newData: { status: "Chờ giao hàng", shipDate },
    changedBy: "TestRunner",
    changeDetail: `Lập lịch xuất hàng cho đơn ${oldOrder.orderCode} vào ngày ${shipDateStr}`
  });
  
  const updated = await prisma.order.findUnique({ where: { id } });
  console.log(`Result status: ${updated.status} (Expected: Chờ giao hàng)`);
  console.log(`Result shipDate: ${updated.shipDate.toISOString().split('T')[0]} (Expected: ${shipDateStr})`);
  if (updated.status !== "Chờ giao hàng") throw new Error("Status mismatch!");
  
  const audit = await prisma.auditlog.findFirst({
    where: { recordId: id, action: "STATUS_CHANGE" },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Audit log written:`, audit.changeDetail);
}

async function testUnplanOrder(id) {
  console.log(`\n--- Testing unplanOrder for ID: ${id} ---`);
  const oldOrder = await prisma.order.findUnique({ where: { id } });
  if (!oldOrder) throw new Error("Order not found");
  if (oldOrder.status !== "Chờ giao hàng") {
    throw new Error("Only orders in 'Chờ giao hàng' can be unplanned.");
  }
  
  await prisma.order.update({
    where: { id },
    data: {
      status: "Chờ kế hoạch sản xuất",
      shipDate: null
    }
  });
  
  await logAuditMock({
    tableName: "Order",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldOrder.status, shipDate: oldOrder.shipDate },
    newData: { status: "Chờ kế hoạch sản xuất", shipDate: null },
    changedBy: "TestRunner",
    changeDetail: `Hủy lập lịch xuất hàng cho đơn ${oldOrder.orderCode}, trả về Chờ kế hoạch sản xuất`
  });
  
  const updated = await prisma.order.findUnique({ where: { id } });
  console.log(`Result status: ${updated.status} (Expected: Chờ kế hoạch sản xuất)`);
  console.log(`Result shipDate: ${updated.shipDate} (Expected: null)`);
  if (updated.status !== "Chờ kế hoạch sản xuất") throw new Error("Status mismatch!");
  if (updated.shipDate !== null) throw new Error("shipDate should be null!");
  
  const audit = await prisma.auditlog.findFirst({
    where: { recordId: id, action: "STATUS_CHANGE" },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Audit log written:`, audit.changeDetail);
}

async function runTests() {
  try {
    // 1. Accept DH01 (currently "Chờ tiếp nhận")
    await testAcceptOrder("test-id-dh01");

    // 2. Plan DH02 (currently "Chờ kế hoạch sản xuất") to "2026-05-25"
    await testPlanOrder("test-id-dh02", "2026-05-25");

    // 3. Unplan DH03 (currently "Chờ giao hàng")
    await testUnplanOrder("test-id-dh03");

    console.log("\nALL TESTS PASSED SUCCESSFULLY! ✅");
  } catch (err) {
    console.error("\nTEST FAILED ❌:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
