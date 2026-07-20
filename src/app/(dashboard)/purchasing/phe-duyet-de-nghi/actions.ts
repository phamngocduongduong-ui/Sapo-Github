"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getUserModuleBranchFilter } from "@/lib/permissions";

export async function getPheDuyetProposals() {
  const session = await getSession();
  if (!session) return [];

  const user = await (prisma as any).user.findUnique({
    where: { id: session.userId }
  });
  if (!user) return [];

  const filter = await getUserModuleBranchFilter(user.id, "TM_PHE_DUYET_DE_NGHI", session.activeBranch, {
    branchField: "branch"
  });

  const proposals = await (prisma as any).purchasingproposal.findMany({
    where: {
      ...filter,
      status: { in: ["Chờ duyệt", "Chờ thực hiện", "Đã phê duyệt", "Từ chối", "Hoàn thành"] }
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
          },
          status: {
            notIn: ["Tạo mới", "Từ chối"]
          }
        }
      },
      select: {
        proposalProductName: true,
        requestedQuantity: true,
        unit: true,
        purchaseorder: {
          select: {
            status: true,
            poCode: true,
            deliveryDate: true,
            createdAt: true
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
        
        // Sort by PO creation time ascending (oldest first)
        matchedDetails.sort((a: any, b: any) => {
          const timeA = a.purchaseorder?.createdAt ? new Date(a.purchaseorder.createdAt).getTime() : 0;
          const timeB = b.purchaseorder?.createdAt ? new Date(b.purchaseorder.createdAt).getTime() : 0;
          return timeA - timeB;
        });

        (item as any).orderHistory = matchedDetails.map((d: any) => ({
          poCode: d.purchaseorder?.poCode || "",
          quantity: d.requestedQuantity || 0,
          unit: d.unit || "",
          deliveryDate: d.purchaseorder?.deliveryDate 
            ? new Date(d.purchaseorder.deliveryDate).toLocaleDateString("vi-VN") 
            : "Chưa xếp lịch"
        }));
      } else {
        (item as any).poStatus = "";
        (item as any).orderHistory = [];
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

  const oldProposal = await (prisma as any).purchasingproposal.findUnique({ where: { id } });
  if (!oldProposal) throw new Error("Không tìm thấy đề nghị");
  if (oldProposal.status !== "Chờ duyệt") {
    throw new Error("Đề nghị không ở trạng thái Chờ duyệt");
  }

  const updatedProposal = await (prisma as any).purchasingproposal.update({
    where: { id },
    data: { 
      status: "Chờ thực hiện", 
      updatedAt: new Date() 
    }
  });

  await logAudit({
    tableName: "PurchasingProposal",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: "Chờ duyệt" },
    newData: { status: "Chờ thực hiện" },
    changedBy: approver,
    changeDetail: `Phê duyệt đề nghị mua hàng: ${oldProposal.proposalCode}`
  });

  revalidatePath("/purchasing/de-nghi");
  revalidatePath("/purchasing/phe-duyet-de-nghi");
  revalidatePath("/purchasing/lenh-mua");
  return updatedProposal;
}

export async function rejectProposal(id: string, reason: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const approver = user?.employeeName || user?.username || "Hệ thống";

  const oldProposal = await (prisma as any).purchasingproposal.findUnique({ where: { id } });
  if (!oldProposal) throw new Error("Không tìm thấy đề nghị");
  if (oldProposal.status !== "Chờ duyệt") {
    throw new Error("Đề nghị không ở trạng thái Chờ duyệt");
  }

  const updatedProposal = await (prisma as any).purchasingproposal.update({
    where: { id },
    data: { 
      status: "Tạo mới",
      note: oldProposal.note ? `${oldProposal.note} (Từ chối: ${reason})` : `Từ chối: ${reason}`,
      updatedAt: new Date() 
    }
  });

  await logAudit({
    tableName: "PurchasingProposal",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: "Chờ duyệt", note: oldProposal.note },
    newData: { status: "Tạo mới", note: updatedProposal.note },
    changedBy: approver,
    changeDetail: `Từ chối đề nghị mua hàng: ${oldProposal.proposalCode}. Lý do: ${reason}`
  });

  revalidatePath("/purchasing/de-nghi");
  revalidatePath("/purchasing/phe-duyet-de-nghi");
  revalidatePath("/purchasing/lenh-mua");
  return updatedProposal;
}

export async function cancelApproveProposal(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const approver = user?.employeeName || user?.username || "Hệ thống";

  const oldProposal = await (prisma as any).purchasingproposal.findUnique({ where: { id } });
  if (!oldProposal) throw new Error("Không tìm thấy đề nghị");
  if (oldProposal.status !== "Chờ thực hiện" && oldProposal.status !== "Đã phê duyệt" && oldProposal.status !== "Từ chối") {
    throw new Error("Chỉ có thể bỏ duyệt đề nghị ở trạng thái Chờ thực hiện, Đã phê duyệt hoặc Từ chối");
  }

  // Check if items are already ordered
  const proposalCode = oldProposal.proposalCode;
  const poDetailsCount = await (prisma as any).purchaseorderdetail.count({
    where: {
      purchaseorder: {
        purpose: {
          contains: proposalCode
        },
        status: {
          notIn: ["Tạo mới", "Từ chối"]
        }
      }
    }
  });

  if (poDetailsCount > 0) {
    throw new Error("Đề nghị đã được lập đơn mua hàng hoạt động, không thể bỏ duyệt");
  }

  const updatedProposal = await (prisma as any).purchasingproposal.update({
    where: { id },
    data: { 
      status: "Chờ duyệt",
      updatedAt: new Date() 
    }
  });

  await logAudit({
    tableName: "PurchasingProposal",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldProposal.status },
    newData: { status: "Chờ duyệt" },
    changedBy: approver,
    changeDetail: `Hủy bỏ quyết định duyệt đề nghị mua hàng: ${oldProposal.proposalCode}`
  });

  revalidatePath("/purchasing/de-nghi");
  revalidatePath("/purchasing/phe-duyet-de-nghi");
  revalidatePath("/purchasing/lenh-mua");
  return updatedProposal;
}
