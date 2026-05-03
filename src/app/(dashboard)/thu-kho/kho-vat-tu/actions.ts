"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function getPendingWarehouseInvoices() {
  return await (prisma as any).purchaseinvoice.findMany({
    where: {
      status: "Chờ giao hàng",
      warehouseName: { contains: "Kho vật tư" }
    },
    include: { purchaseinvoicedetail: true },
    orderBy: { updatedAt: "desc" }
  });
}

export async function getPendingWarehouseDispatches() {
  // Assuming dispatchorder status is "PENDING" or similar for "chờ thực hiện"
  // And destination contains "Kho vật tư"
  return await (prisma as any).dispatchorder.findMany({
    where: {
      status: "PENDING",
      OR: [
        { origin: { contains: "Kho vật tư" } },
        { destination: { contains: "Kho vật tư" } }
      ]
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getWarehouseLogs() {
  return await (prisma as any).warehouselog.findMany({
    include: { details: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function createWarehouseLog(data: any, details: any[]) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const creator = user?.employeeName || user?.username || "Hệ thống";

  const count = await (prisma as any).warehouselog.count();
  const logCode = `WHL-${(count + 1).toString().padStart(5, "0")}`;

  const log = await (prisma as any).warehouselog.create({
    data: {
      id: require('crypto').randomUUID(),
      logCode,
      logType: data.logType,
      creator,
      referenceCode: data.referenceCode || null,
      subject: data.subject || null,
      description: data.description || null,
      status: "Đã nhập kho",
      note: data.note || "",
      details: {
        create: details.map(d => ({
          id: require('crypto').randomUUID(),
          productCode: d.productCode,
          productName: d.productName,
          unit: d.unit || null,
          requestedQuantity: parseFloat(d.requestedQuantity) || 0,
          actualQuantity: parseFloat(d.actualQuantity) || 0,
          orderCode: d.orderCode || null,
          note: d.note || ""
        }))
      }
    }
  });

  // If created from an invoice, update invoice AND order status
  if (data.referenceCode && data.logType === "Nhập kho") {
    const inv = await (prisma as any).purchaseinvoice.findUnique({
      where: { invoiceCode: data.referenceCode }
    });
    if (inv) {
      await (prisma as any).purchaseinvoice.update({
        where: { id: inv.id },
        data: { status: "Đã nhập kho" }
      });

      await logAudit({
        tableName: "PurchaseInvoice",
        recordId: inv.id,
        action: "STATUS_CHANGE",
        oldData: { status: inv.status },
        newData: { status: "Đã nhập kho" },
        changedBy: creator,
        changeDetail: `Đã nhập kho (Phiếu: ${logCode})`
      });
      
      if (inv.purchaseOrderId) {
        const po = await (prisma as any).purchaseorder.findUnique({ where: { id: inv.purchaseOrderId } });
        await (prisma as any).purchaseorder.update({
          where: { id: inv.purchaseOrderId },
          data: { status: "Đã nhập kho" }
        });

        await logAudit({
          tableName: "PurchaseOrder",
          recordId: inv.purchaseOrderId,
          action: "STATUS_CHANGE",
          oldData: { status: po?.status },
          newData: { status: "Đã nhập kho" },
          changedBy: creator,
          changeDetail: `Hàng đã về kho (Phiếu nhập: ${logCode}, theo đơn mua: ${data.referenceCode})`
        });
      }
    }
  }

  // If created from a dispatch, update dispatch status
  if (data.referenceCode && data.logType === "Xuất kho") {
    const dispatch = await (prisma as any).dispatchorder.findUnique({
      where: { id: data.referenceCode }
    });
    if (dispatch) {
      await (prisma as any).dispatchorder.update({
        where: { id: dispatch.id },
        data: { status: "Đã xuất kho" }
      });
    }
  }

  revalidatePath("/thu-kho/kho-vat-tu");
  return log;
}

export async function updateWarehouseLog(id: string, data: any, details: any[]) {
  await (prisma as any).warehouselog.update({
    where: { id },
    data: {
      logType: data.logType,
      subject: data.subject || null,
      description: data.description || null,
      note: data.note || "",
      details: {
        deleteMany: {},
        create: details.map(d => ({
          id: require('crypto').randomUUID(),
          productCode: d.productCode,
          productName: d.productName,
          unit: d.unit || null,
          requestedQuantity: parseFloat(d.requestedQuantity) || 0,
          actualQuantity: parseFloat(d.actualQuantity) || 0,
          orderCode: d.orderCode || null,
          note: d.note || ""
        }))
      }
    }
  });
  revalidatePath("/thu-kho/kho-vat-tu");
}

export async function deleteWarehouseLog(id: string) {
  const log = await (prisma as any).warehouselog.findUnique({
    where: { id }
  });

  if (log?.referenceCode) {
    if (log.logType === "Nhập kho") {
      const inv = await (prisma as any).purchaseinvoice.findUnique({
        where: { invoiceCode: log.referenceCode }
      });
      if (inv) {
        await (prisma as any).purchaseinvoice.update({
          where: { id: inv.id },
          data: { status: "Chờ giao hàng" }
        });

        await logAudit({
          tableName: "PurchaseInvoice",
          recordId: inv.id,
          action: "STATUS_CHANGE",
          oldData: { status: "Đã nhập kho" },
          newData: { status: "Chờ giao hàng" },
          changedBy: "Hệ thống",
          changeDetail: `Đã xóa phiếu nhập kho ${log.logCode}. Trạng thái trả về: Chờ giao hàng`
        });
        
        if (inv.purchaseOrderId) {
          await (prisma as any).purchaseorder.update({
            where: { id: inv.purchaseOrderId },
            data: { status: "Chờ giao hàng" }
          });

          await logAudit({
            tableName: "PurchaseOrder",
            recordId: inv.purchaseOrderId,
            action: "STATUS_CHANGE",
            oldData: { status: "Đã nhập kho" },
            newData: { status: "Chờ giao hàng" },
            changedBy: "Hệ thống",
            changeDetail: `Đã xóa phiếu nhập kho ${log.logCode}. Lệnh mua chuyển về trạng thái: Chờ giao hàng`
          });
        }
      }
    } else if (log.logType === "Xuất kho") {
      // Assuming it can be matched by ID
      const dispatch = await (prisma as any).dispatchorder.findUnique({
        where: { id: log.referenceCode }
      }).catch(() => null);

      if (dispatch) {
        await (prisma as any).dispatchorder.update({
          where: { id: dispatch.id },
          data: { status: "PENDING" }
        });
      }
    }
  }

  await (prisma as any).warehouselog.delete({ where: { id } });
  revalidatePath("/thu-kho/kho-vat-tu");
}

export async function rejectWarehouseInvoice(invoiceId: string) {
  const inv = await (prisma as any).purchaseinvoice.findUnique({
    where: { id: invoiceId }
  });
  
  if (!inv) return;

  await (prisma as any).purchaseinvoice.update({
    where: { id: invoiceId },
    data: { status: "Chờ mua hàng" }
  });

  if (inv.purchaseOrderId) {
    await (prisma as any).purchaseorder.update({
      where: { id: inv.purchaseOrderId },
      data: { status: "Chờ mua hàng" }
    });
  }

  revalidatePath("/thu-kho/kho-vat-tu");
  revalidatePath("/purchasing/don-mua");
}
