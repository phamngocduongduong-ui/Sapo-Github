"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

// Function to generate the next payment voucher number
export async function generateNextVoucherNumber() {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const prefix = `PC.${year}${month}/`;

  const latest = await (prisma as any).paymentvoucher.findFirst({
    where: { voucherNumber: { startsWith: prefix } },
    orderBy: { voucherNumber: "desc" }
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.voucherNumber.split("/");
    const numPart = parts[parts.length - 1];
    if (numPart && !isNaN(parseInt(numPart, 10))) {
      nextNum = parseInt(numPart, 10) + 1;
    }
  }

  return `${prefix}${nextNum.toString().padStart(4, "0")}`;
}

// Get all payment vouchers
export async function getPaymentVouchers() {
  return await (prisma as any).paymentvoucher.findMany({
    include: {
      items: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

// Get pending purchase orders that require advance payment (Thanh toán trước, phê duyệt sau)
export async function getPendingPurchaseOrders() {
  return await (prisma as any).purchaseorder.findMany({
    where: {
      status: { in: ["Chờ thực hiện", "Chờ thực hiện (Đã phê duyệt)", "Chờ thanh toán"] },
      paymentType: "Thanh toán trước, phê duyệt sau",
      paymentStatus: { not: "Đã thanh toán" } // Do not show if already paid
    },
    include: {
      purchaseorderdetail: true
    },
    orderBy: {
      createdDate: "desc"
    }
  });
}

// Create a new payment voucher
export async function createPaymentVoucher(data: {
  payer: string;
  recipient: string;
  amount: number;
  note: string;
  purchaseOrderId?: string;
  poCode?: string;
  items: Array<{
    content: string;
    unit: string;
    quantity: number;
    price: number;
  }>;
}) {
  const session = await getSession();
  if (!session) {
    throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
  }

  const voucherNumber = await generateNextVoucherNumber();
  const voucherId = require("crypto").randomUUID();

  const voucher = await (prisma as any).paymentvoucher.create({
    data: {
      id: voucherId,
      voucherNumber,
      payer: data.payer,
      recipient: data.recipient,
      amount: data.amount,
      note: data.note || null,
      purchaseOrderId: data.purchaseOrderId || null,
      poCode: data.poCode || null,
      status: "Tạo mới",
      items: {
        create: data.items.map((item) => ({
          id: require("crypto").randomUUID(),
          content: item.content,
          unit: item.unit || null,
          quantity: item.quantity,
          price: item.price,
          amount: item.quantity * item.price
        }))
      }
    }
  });

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const creatorName = user?.employeeName || user?.username || "Nhân viên";

  await logAudit({
    tableName: "PaymentVoucher",
    recordId: voucherId,
    action: "CREATE",
    newData: {
      voucherNumber,
      payer: data.payer,
      recipient: data.recipient,
      amount: data.amount,
      status: "Tạo mới",
      poCode: data.poCode
    },
    changedBy: creatorName,
    changeDetail: `Lập phiếu chi mới: ${voucherNumber} với tổng tiền ${data.amount.toLocaleString()} VNĐ`
  });

  revalidatePath("/accounting/phieu-chi");
  return { success: true, voucher };
}

// Update payment voucher status (duyệt, gửi duyệt, từ chối, hủy)
export async function updateVoucherStatus(voucherId: string, newStatus: string) {
  const session = await getSession();
  if (!session) {
    throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
  }

  const oldVoucher = await (prisma as any).paymentvoucher.findUnique({
    where: { id: voucherId }
  });

  if (!oldVoucher) {
    throw new Error("Phiếu chi không tồn tại.");
  }

  const voucher = await (prisma as any).paymentvoucher.update({
    where: { id: voucherId },
    data: { status: newStatus }
  });

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "PaymentVoucher",
    recordId: voucherId,
    action: "STATUS_CHANGE",
    oldData: { status: oldVoucher.status },
    newData: { status: newStatus },
    changedBy,
    changeDetail: `Chuyển trạng thái phiếu chi ${voucher.voucherNumber} sang: ${newStatus}`
  });

  // If status becomes "Đã duyệt" and there is a linked purchase order, update the PO status & payment status
  if (newStatus === "Đã duyệt" && voucher.purchaseOrderId) {
    const po = await (prisma as any).purchaseorder.findUnique({
      where: { id: voucher.purchaseOrderId }
    });

    if (po) {
      await (prisma as any).purchaseorder.update({
        where: { id: voucher.purchaseOrderId },
        data: {
          status: "Chờ giao hàng",
          paymentStatus: "Đã thanh toán"
        }
      });

      await logAudit({
        tableName: "PurchaseOrder",
        recordId: po.id,
        action: "STATUS_CHANGE",
        oldData: { status: po.status, paymentStatus: po.paymentStatus },
        newData: { status: "Chờ giao hàng", paymentStatus: "Đã thanh toán" },
        changedBy,
        changeDetail: `Đồng bộ trạng thái thanh toán từ phiếu chi đã duyệt: ${voucher.voucherNumber}`
      });

      revalidatePath("/purchasing/lenh-mua");
      revalidatePath("/purchasing/don-mua");
    }
  }

  revalidatePath("/accounting/phieu-chi");
  return { success: true };
}

// Delete payment voucher (only allowed if status is "Tạo mới")
export async function deletePaymentVoucher(voucherId: string) {
  const session = await getSession();
  if (!session) {
    throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
  }

  const existing = await (prisma as any).paymentvoucher.findUnique({
    where: { id: voucherId }
  });

  if (!existing) {
    throw new Error("Phiếu chi không tồn tại.");
  }

  if (existing.status !== "Tạo mới") {
    throw new Error("Chỉ có thể xóa phiếu chi ở trạng thái Tạo mới.");
  }

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await (prisma as any).paymentvoucher.delete({
    where: { id: voucherId }
  });

  await logAudit({
    tableName: "PaymentVoucher",
    recordId: voucherId,
    action: "DELETE",
    oldData: existing,
    changedBy,
    changeDetail: `Xóa phiếu chi: ${existing.voucherNumber}`
  });

  revalidatePath("/accounting/phieu-chi");
  return { success: true };
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await (prisma as any).user.findUnique({
    where: { id: session.userId }
  });
  return {
    name: user?.employeeName || user?.username || "Nhân viên",
    role: user?.role || "Staff",
    username: user?.username || ""
  };
}
