"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

// Function to generate the next DN proposal number
export async function generateNextProposalNumber() {
  const latest = await (prisma as any).paymentproposal.findFirst({
    where: { proposalNumber: { startsWith: "DN" } },
    orderBy: { proposalNumber: "desc" }
  });

  let nextNum = 1;
  if (latest) {
    const match = latest.proposalNumber.match(/^DN(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  return `DN${nextNum.toString().padStart(5, '0')}`;
}

// Action to create a new payment proposal
export async function createPaymentProposal(data: {
  proposer: string;
  supplierCode: string;
  supplierName: string;
  accountInfo: string;
  purpose: string;
  note: string;
  items: Array<{
    content: string;
    unit: string;
    quantity: number;
    price: number;
    rate: number;
  }>;
}) {
  const session = await getSession();
  if (!session) {
    throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
  }

  const proposalNumber = await generateNextProposalNumber();
  const proposalId = require('crypto').randomUUID();

  await (prisma as any).paymentproposal.create({
    data: {
      id: proposalId,
      proposalNumber,
      proposer: data.proposer,
      supplierCode: data.supplierCode || null,
      supplierName: data.supplierName || null,
      accountInfo: data.accountInfo || null,
      purpose: data.purpose || null,
      note: data.note || null,
      status: "Tạo mới",
      items: {
        create: data.items.map((item) => {
          const amount = item.quantity * item.price;
          const total = amount - (amount * (item.rate || 0) / 100);
          return {
            id: require('crypto').randomUUID(),
            content: item.content,
            unit: item.unit || null,
            quantity: item.quantity,
            price: item.price,
            amount,
            rate: item.rate || 0,
            total
          };
        })
      }
    }
  });

  await logAudit({
    tableName: "PaymentProposal",
    recordId: proposalId,
    action: "CREATE",
    newData: {
      proposalNumber,
      proposer: data.proposer,
      supplierName: data.supplierName,
      purpose: data.purpose,
      status: "Tạo mới"
    },
    changedBy: data.proposer,
    changeDetail: `Tạo đề xuất thanh toán mới: ${proposalNumber}`
  });

  revalidatePath("/accounting/thanh-toan");
  return { success: true };
}

// Action to update proposal status
export async function updateProposalStatus(proposalId: string, newStatus: string) {
  const session = await getSession();
  if (!session) {
    throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
  }

  const oldProposal = await (prisma as any).paymentproposal.findUnique({
    where: { id: proposalId }
  });

  const proposal = await (prisma as any).paymentproposal.update({
    where: { id: proposalId },
    data: { status: newStatus }
  });

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "PaymentProposal",
    recordId: proposalId,
    action: "STATUS_CHANGE",
    oldData: { status: oldProposal?.status },
    newData: { status: newStatus },
    changedBy,
    changeDetail: `Chuyển trạng thái đề xuất thanh toán sang: ${newStatus}`
  });

  // If status is "Hoàn thành" (paid), update the linked purchase order status & payment status
  if (newStatus === "Hoàn thành") {
    const po = await (prisma as any).purchaseorder.findFirst({
      where: { paymentProposalId: proposalId }
    });

    if (po) {
      await (prisma as any).purchaseorder.update({
        where: { id: po.id },
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
        changeDetail: `Đồng bộ trạng thái thanh toán từ đề xuất thanh toán hoàn thành: ${proposal.proposalNumber}`
      });

      revalidatePath("/purchasing/lenh-mua");
    }
  }

  revalidatePath("/accounting/thanh-toan");
  revalidatePath("/phe-duyet/thanh-toan");
  return { success: true };
}

// Action to delete a proposal (only allowed if status is "Tạo mới")
export async function deletePaymentProposal(proposalId: string) {
  const session = await getSession();
  if (!session) {
    throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
  }

  const existing = await (prisma as any).paymentproposal.findUnique({
    where: { id: proposalId }
  });

  if (!existing) {
    throw new Error("Đề nghị thanh toán không tồn tại.");
  }

  if (existing.status !== "Tạo mới") {
    throw new Error("Chỉ có thể xóa đề nghị thanh toán ở trạng thái Tạo mới.");
  }

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await (prisma as any).paymentproposal.delete({
    where: { id: proposalId }
  });

  await logAudit({
    tableName: "PaymentProposal",
    recordId: proposalId,
    action: "DELETE",
    oldData: existing,
    changedBy,
    changeDetail: `Xóa đề xuất thanh toán: ${existing.proposalNumber}`
  });

  revalidatePath("/accounting/thanh-toan");
  return { success: true };
}
