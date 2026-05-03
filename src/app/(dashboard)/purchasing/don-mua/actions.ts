"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function getPendingPurchaseOrders() {
  return await (prisma as any).purchaseorder.findMany({
    where: { status: "Chờ mua hàng" },
    include: { purchaseorderdetail: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getPurchaseInvoices() {
  return await (prisma as any).purchaseinvoice.findMany({
    include: { purchaseinvoicedetail: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getWarehouses() {
  return await (prisma as any).warehouse.findMany({
    where: { status: "Hoạt động" },
    orderBy: { name: "asc" }
  });
}

export async function fixExistingInvoices() {
  try {
    // Fix missing invoiceType
    await (prisma as any).purchaseinvoice.updateMany({
      where: { 
        invoiceType: { notIn: ["Nhập kho", "Xuất kho"] } 
      },
      data: { invoiceType: "Nhập kho" }
    });
    
    // Standardize statuses for the new Tab system
    await (prisma as any).purchaseinvoice.updateMany({
      where: { status: { in: ["Tạo mới", "Chờ mua hàng"] } },
      data: { status: "Chờ giao hàng" }
    });
    
    await (prisma as any).purchaseinvoice.updateMany({
      where: { status: "Đã hoàn thành" },
      data: { status: "Đã nhập kho" }
    });
  } catch (e) {
    // Ignore error if it's just a schema mismatch during transition
  }
}

async function generatePICode(branchName: string) {
  if (!branchName) return "PI-" + Date.now().toString().slice(-4);
  const firstBranchName = branchName.split(",")[0].trim();
  const branch = await (prisma as any).branch.findFirst({ where: { name: firstBranchName } });
  const branchCode = branch ? branch.code : "GEN";

  // Find the latest code for this branch
  const lastInvoice = await (prisma as any).purchaseinvoice.findFirst({
    where: { invoiceCode: { contains: `/${branchCode}` } },
    orderBy: { createdAt: 'desc' }
  });

  let nextNum = 1;
  if (lastInvoice) {
    const match = lastInvoice.invoiceCode.match(/PI-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1]) + 1;
    }
  }

  const codeStr = nextNum.toString().padStart(4, "0");
  return `PI-${codeStr}/${branchCode}`;
}

export async function createPurchaseInvoice(data: any, details: any[], poId?: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const creator = user?.employeeName || user?.username || "Hệ thống";

  const invoiceCode = await generatePICode(data.branch || user?.branch || "");

  const id = require('crypto').randomUUID();
  const now = new Date();

  let poCode = null;
  if (poId) {
    const po = await (prisma as any).purchaseorder.findUnique({ where: { id: poId } });
    poCode = po?.poCode || null;
  }

  const invoice = await (prisma as any).purchaseinvoice.create({
    data: {
      id,
      invoiceCode,
      creator,
      branch: data.branch || user?.branch || "",
      supplier: data.supplier,
      status: "Chờ giao hàng",
      deliveryDate: new Date(data.deliveryDate),
      note: data.note || "",
      purchaseOrderId: poId || null,
      poCode,
      invoiceType: data.invoiceType || "Nhập kho",
      warehouseName: data.warehouseName || null,
      updatedAt: now,
      purchaseinvoicedetail: {
        create: details.map(d => ({
          id: require('crypto').randomUUID(),
          productCode: d.productCode,
          productName: d.productName,
          requestedQuantity: parseFloat(d.requestedQuantity) || 0,
          purchasedQuantity: parseFloat(d.purchasedQuantity) || 0,
          unit: d.unit || "",
          deliveryLocation: d.deliveryLocation || "",
          note: d.note || "",
          updatedAt: now
        }))
      }
    }
  });

  if (poId) {
    const updatedPO = await (prisma as any).purchaseorder.update({
      where: { id: poId },
      data: { status: "Chờ giao hàng", updatedAt: now }
    });

    await logAudit({
      tableName: "PurchaseOrder",
      recordId: poId,
      action: "STATUS_CHANGE",
      oldData: { status: "Chờ mua hàng" },
      newData: { status: "Chờ giao hàng" },
      changedBy: creator,
      changeDetail: `Đã tạo đơn mua ${invoiceCode} từ lệnh mua này`
    });
  }

  await logAudit({
    tableName: "PurchaseInvoice",
    recordId: invoice.id,
    action: "CREATE",
    newData: invoice,
    changedBy: creator,
    changeDetail: `Tạo đơn mua mới: ${invoiceCode}`
  });

  revalidatePath("/purchasing/don-mua");
  return invoice;
}

export async function updateInvoiceStatus(id: string, status: string) {
  const session = await getSession();
  const user = await (prisma as any).user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  const updated = await (prisma as any).purchaseinvoice.update({
    where: { id },
    data: { status, updatedAt: new Date() }
  });

  await logAudit({
    tableName: "PurchaseInvoice",
    recordId: id,
    action: "STATUS_CHANGE",
    newData: { status },
    changedBy,
    changeDetail: `Chuyển trạng thái đơn mua sang: ${status}`
  });

  revalidatePath("/purchasing/don-mua");
}

export async function rejectPurchaseOrder(id: string) {
  const session = await getSession();
  const user = await (prisma as any).user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  const updated = await (prisma as any).purchaseorder.update({
    where: { id },
    data: { status: "Tạo mới", updatedAt: new Date() }
  });

  await logAudit({
    tableName: "PurchaseOrder",
    recordId: id,
    action: "STATUS_CHANGE",
    newData: { status: "Tạo mới" },
    changedBy,
    changeDetail: `Từ chối lệnh mua: ${updated.poCode}`
  });

  revalidatePath("/purchasing/don-mua");
  revalidatePath("/purchasing/lenh-mua");
}

export async function updatePurchaseInvoice(id: string, data: any, details: any[]) {
  const session = await getSession();
  const user = await (prisma as any).user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  const oldInv = await (prisma as any).purchaseinvoice.findUnique({ 
    where: { id },
    include: { purchaseinvoicedetail: true }
  });

  const now = new Date();
  const updatedInv = await (prisma as any).purchaseinvoice.update({
    where: { id },
    data: {
      supplier: data.supplier,
      deliveryDate: new Date(data.deliveryDate),
      note: data.note || "",
      invoiceType: data.invoiceType || "Nhập kho",
      warehouseName: data.warehouseName || null,
      updatedAt: now,
      purchaseinvoicedetail: {
        deleteMany: {},
        create: details.map(d => ({
          id: require('crypto').randomUUID(),
          productCode: d.productCode,
          productName: d.productName,
          requestedQuantity: parseFloat(d.requestedQuantity) || 0,
          purchasedQuantity: parseFloat(d.purchasedQuantity) || 0,
          unit: d.unit || "",
          deliveryLocation: d.deliveryLocation || "",
          note: d.note || "",
          updatedAt: now
        }))
      }
    },
    include: { purchaseinvoicedetail: true }
  });

  await logAudit({
    tableName: "PurchaseInvoice",
    recordId: id,
    action: "UPDATE",
    oldData: oldInv,
    newData: updatedInv,
    changedBy,
    changeDetail: `Cập nhật đơn mua: ${updatedInv.invoiceCode}`
  });

  revalidatePath("/purchasing/don-mua");
}

export async function deletePurchaseInvoice(id: string) {
  const session = await getSession();
  const user = await (prisma as any).user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  const oldInv = await (prisma as any).purchaseinvoice.findUnique({ where: { id } });

  if (oldInv?.purchaseOrderId) {
    const updatedPO = await (prisma as any).purchaseorder.update({
      where: { id: oldInv.purchaseOrderId },
      data: { status: "Chờ mua hàng", updatedAt: new Date() }
    });

    await logAudit({
      tableName: "PurchaseOrder",
      recordId: oldInv.purchaseOrderId,
      action: "STATUS_CHANGE",
      oldData: { status: "Chờ giao hàng" },
      newData: { status: "Chờ mua hàng" },
      changedBy,
      changeDetail: `Đã xóa đơn mua ${oldInv.invoiceCode}, lệnh mua quay về trạng thái Chờ mua hàng`
    });
  }

  await (prisma as any).purchaseinvoice.delete({ where: { id } });

  await logAudit({
    tableName: "PurchaseInvoice",
    recordId: id,
    action: "DELETE",
    oldData: oldInv,
    changedBy,
    changeDetail: `Xóa đơn mua: ${oldInv?.invoiceCode}`
  });

  revalidatePath("/purchasing/don-mua");
}
