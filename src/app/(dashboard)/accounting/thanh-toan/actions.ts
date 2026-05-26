"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

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

  revalidatePath("/accounting/thanh-toan");
  return { success: true };
}

// Action to update proposal status
export async function updateProposalStatus(proposalId: string, newStatus: string) {
  const session = await getSession();
  if (!session) {
    throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
  }

  await (prisma as any).paymentproposal.update({
    where: { id: proposalId },
    data: { status: newStatus }
  });

  revalidatePath("/accounting/thanh-toan");
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

  await (prisma as any).paymentproposal.delete({
    where: { id: proposalId }
  });

  revalidatePath("/accounting/thanh-toan");
  return { success: true };
}
