"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

// Function to generate the next receipt voucher number
export async function generateNextVoucherNumber() {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const prefix = `PT.${year}${month}/`;

  const latest = await (prisma as any).receiptvoucher.findFirst({
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

// Get all receipt vouchers
export async function getReceiptVouchers() {
  return await (prisma as any).receiptvoucher.findMany({
    orderBy: {
      createdAt: "desc"
    }
  });
}

// Create a new receipt voucher
export async function createReceiptVoucher(data: {
  receiver: string;
  payer: string;
  amount: number;
  note: string;
}) {
  const session = await getSession();
  if (!session) {
    throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
  }

  const voucherNumber = await generateNextVoucherNumber();
  const voucherId = require("crypto").randomUUID();

  const voucher = await (prisma as any).receiptvoucher.create({
    data: {
      id: voucherId,
      voucherNumber,
      receiver: data.receiver,
      payer: data.payer,
      amount: data.amount,
      note: data.note || null,
      status: "Tạo mới"
    }
  });

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const creatorName = user?.employeeName || user?.username || "Nhân viên";

  await logAudit({
    tableName: "ReceiptVoucher",
    recordId: voucherId,
    action: "CREATE",
    newData: {
      voucherNumber,
      receiver: data.receiver,
      payer: data.payer,
      amount: data.amount,
      status: "Tạo mới"
    },
    changedBy: creatorName,
    changeDetail: `Lập phiếu thu mới: ${voucherNumber} với tổng tiền ${data.amount.toLocaleString()} VNĐ`
  });

  revalidatePath("/accounting/phieu-thu");
  return { success: true, voucher };
}

// Update receipt voucher status (duyệt, gửi duyệt, từ chối, hủy)
export async function updateVoucherStatus(voucherId: string, newStatus: string) {
  const session = await getSession();
  if (!session) {
    throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
  }

  const oldVoucher = await (prisma as any).receiptvoucher.findUnique({
    where: { id: voucherId }
  });

  if (!oldVoucher) {
    throw new Error("Phiếu thu không tồn tại.");
  }

  const voucher = await (prisma as any).receiptvoucher.update({
    where: { id: voucherId },
    data: { status: newStatus }
  });

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "ReceiptVoucher",
    recordId: voucherId,
    action: "STATUS_CHANGE",
    oldData: { status: oldVoucher.status },
    newData: { status: newStatus },
    changedBy,
    changeDetail: `Chuyển trạng thái phiếu thu ${voucher.voucherNumber} sang: ${newStatus}`
  });

  revalidatePath("/accounting/phieu-thu");
  return { success: true };
}

// Delete receipt voucher (only allowed if status is "Tạo mới")
export async function deleteReceiptVoucher(voucherId: string) {
  const session = await getSession();
  if (!session) {
    throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
  }

  const existing = await (prisma as any).receiptvoucher.findUnique({
    where: { id: voucherId }
  });

  if (!existing) {
    throw new Error("Phiếu thu không tồn tại.");
  }

  if (existing.status !== "Tạo mới") {
    throw new Error("Chỉ có thể xóa phiếu thu ở trạng thái Tạo mới.");
  }

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await (prisma as any).receiptvoucher.delete({
    where: { id: voucherId }
  });

  await logAudit({
    tableName: "ReceiptVoucher",
    recordId: voucherId,
    action: "DELETE",
    oldData: existing,
    changedBy,
    changeDetail: `Xóa phiếu thu: ${existing.voucherNumber}`
  });

  revalidatePath("/accounting/phieu-thu");
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
