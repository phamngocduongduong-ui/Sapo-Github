"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function getPheDuyetProposals() {
  const session = await getSession();
  if (!session) return [];

  const user = await (prisma as any).user.findUnique({
    where: { id: session.userId }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const userBranches = user?.branch ? user.branch.split(",").map((b: string) => b.trim()).filter(Boolean) : [];

  const proposals = await (prisma as any).maintenanceproposal.findMany({
    where: {
      branch: isAdmin ? undefined : { in: userBranches },
      status: { in: ["Chờ duyệt", "Đã phê duyệt", "Từ chối"] }
    },
    include: { items: true },
    orderBy: { updatedAt: "desc" },
  });

  // Calculate ordered quantity and PO status for each item
  for (const proposal of proposals) {
    const proposalCode = proposal.proposalCode;
    const poDetails = await (prisma as any).purchaseorderdetail.findMany({
      where: {
        purchaseorder: {
          purpose: {
            contains: proposalCode
          }
        }
      },
      select: {
        proposalProductName: true,
        requestedQuantity: true,
        purchaseorder: {
          select: {
            status: true
          }
        }
      }
    });

    for (const item of proposal.items) {
      const matchedDetails = poDetails.filter((d: any) => d.proposalProductName === item.productName);
      const orderedQty = matchedDetails.reduce((sum: number, d: any) => sum + (d.requestedQuantity || 0), 0);
      (item as any).orderedQuantity = orderedQty;
      
      if (orderedQty > 0) {
        const statuses = Array.from(new Set(matchedDetails.map((d: any) => d.purchaseorder?.status).filter(Boolean)));
        (item as any).poStatus = statuses.join(", ");
      } else {
        (item as any).poStatus = "";
      }
    }
  }

  return proposals;
}

export async function approveProposal(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const approver = user?.employeeName || user?.username || "Hệ thống";

  const oldProposal = await (prisma as any).maintenanceproposal.findUnique({ where: { id } });
  if (!oldProposal) throw new Error("Không tìm thấy đề nghị");
  if (oldProposal.status !== "Chờ duyệt") {
    throw new Error("Đề nghị không ở trạng thái Chờ duyệt");
  }

  const updatedProposal = await (prisma as any).maintenanceproposal.update({
    where: { id },
    data: { 
      status: "Đã phê duyệt", 
      updatedAt: new Date() 
    }
  });

  await logAudit({
    tableName: "MaintenanceProposal",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: "Chờ duyệt" },
    newData: { status: "Đã phê duyệt" },
    changedBy: approver,
    changeDetail: `Phê duyệt đề nghị mua: ${oldProposal.proposalCode}`
  });

  revalidatePath("/maintenance/de-nghi-mua");
  revalidatePath("/maintenance/phe-duyet");
  revalidatePath("/purchasing/lenh-mua");
  return updatedProposal;
}

export async function rejectProposal(id: string, reason: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const approver = user?.employeeName || user?.username || "Hệ thống";

  const oldProposal = await (prisma as any).maintenanceproposal.findUnique({ where: { id } });
  if (!oldProposal) throw new Error("Không tìm thấy đề nghị");
  if (oldProposal.status !== "Chờ duyệt") {
    throw new Error("Đề nghị không ở trạng thái Chờ duyệt");
  }

  const updatedProposal = await (prisma as any).maintenanceproposal.update({
    where: { id },
    data: { 
      status: "Từ chối",
      note: oldProposal.note ? `${oldProposal.note} (Từ chối: ${reason})` : `Từ chối: ${reason}`,
      updatedAt: new Date() 
    }
  });

  await logAudit({
    tableName: "MaintenanceProposal",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: "Chờ duyệt", note: oldProposal.note },
    newData: { status: "Từ chối", note: updatedProposal.note },
    changedBy: approver,
    changeDetail: `Từ chối đề nghị mua: ${oldProposal.proposalCode}. Lý do: ${reason}`
  });

  revalidatePath("/maintenance/de-nghi-mua");
  revalidatePath("/maintenance/phe-duyet");
  revalidatePath("/purchasing/lenh-mua");
  return updatedProposal;
}

export async function cancelApproveProposal(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const changer = user?.employeeName || user?.username || "Hệ thống";

  const oldProposal = await (prisma as any).maintenanceproposal.findUnique({ where: { id } });
  if (!oldProposal) throw new Error("Không tìm thấy đề nghị");
  if (oldProposal.status !== "Đã phê duyệt") {
    throw new Error("Đề nghị không ở trạng thái Đã phê duyệt");
  }

  const updatedProposal = await (prisma as any).maintenanceproposal.update({
    where: { id },
    data: { 
      status: "Chờ duyệt", 
      updatedAt: new Date() 
    }
  });

  await logAudit({
    tableName: "MaintenanceProposal",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: "Đã phê duyệt" },
    newData: { status: "Chờ duyệt" },
    changedBy: changer,
    changeDetail: `Hủy phê duyệt đề nghị mua: ${oldProposal.proposalCode}`
  });

  revalidatePath("/maintenance/de-nghi-mua");
  revalidatePath("/maintenance/phe-duyet");
  revalidatePath("/purchasing/lenh-mua");
  return updatedProposal;
}
