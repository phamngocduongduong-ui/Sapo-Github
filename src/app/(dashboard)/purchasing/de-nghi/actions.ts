"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getUserModuleBranchFilter } from "@/lib/permissions";

function capitalizeFirst(str: string): string {
  if (!str) return "";
  const trimmed = str.trim();
  if (trimmed.length === 0) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export async function getProposals() {
  const session = await getSession();
  if (!session) return [];

  const user = await (prisma as any).user.findUnique({
    where: { id: session.userId }
  });
  if (!user) return [];

  const filter = await getUserModuleBranchFilter(user.id, "TM_DE_NGHI", session.activeBranch, {
    branchField: "branch",
    creatorField: "proposer"
  });

  const proposals = await (prisma as any).purchasingproposal.findMany({
    where: filter,
    include: { items: true },
    orderBy: { createdAt: "desc" },
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

export async function getBranches() {
  return await (prisma as any).branch.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" }
  });
}

export async function generateProposalCode(branchName: string) {
  if (!branchName) return "";
  const branch = await (prisma as any).branch.findFirst({
    where: { name: branchName }
  });
  const branchCode = branch ? branch.code : "";
  if (!branchCode) return "";

  const prefix = `DN${branchCode}`;
  const proposals = await (prisma as any).purchasingproposal.findMany({
    where: {
      proposalCode: {
        startsWith: prefix
      }
    },
    select: { proposalCode: true }
  });

  const nums = proposals
    .map((p: any) => {
      const numPart = p.proposalCode.substring(prefix.length);
      return parseInt(numPart);
    })
    .filter((n: number) => !isNaN(n));

  const max = nums.length > 0 ? Math.max(...nums) : 0;
  const nextNum = (max + 1).toString().padStart(4, "0");

  return `${prefix}${nextNum}`;
}

export async function createProposal(formData: FormData, details: any[], attachmentsList?: any[]) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const proposer = user?.employeeName || user?.username || "Hệ thống";

  const selectedBranch = formData.get("branch") as string;
  const purpose = formData.get("purpose") as string;
  const urgency = formData.get("urgency") as string;
  const note = formData.get("note") as string;
  const deliveryDateRaw = formData.get("deliveryDate") as string;
  const deliveryDate = deliveryDateRaw ? new Date(deliveryDateRaw) : null;
  const deliveryPlace = formData.get("deliveryPlace") as string;

  const attachmentsRaw = formData.get("attachments") as string;
  const attachments = attachmentsList ? JSON.stringify(attachmentsList) : attachmentsRaw;

  const branch = selectedBranch || user?.branch?.split(",")[0].trim() || "";
  const proposalCode = await generateProposalCode(branch);

  const id = require('crypto').randomUUID();
  const now = new Date();

  const proposal = await (prisma as any).purchasingproposal.create({
    data: {
      id,
      proposalCode,
      proposer,
      branch,
      purpose,
      urgency,
      note: note || "",
      attachments: attachments || null,
      deliveryDate,
      deliveryPlace: deliveryPlace || null,
      status: "Tạo mới",
      createdAt: now,
      updatedAt: now,
      items: {
        create: details.map(d => {
          const qty = parseFloat(d.quantity) || 0;
          const price = parseFloat(d.price) || 0;
          return {
            id: require('crypto').randomUUID(),
            productName: capitalizeFirst(d.productName),
            techStandard: capitalizeFirst(d.techStandard),
            unit: capitalizeFirst(d.unit),
            quantity: qty,
            price: price,
            amount: qty * price,
            note: d.note || "",
            createdAt: now,
            updatedAt: now
          };
        })
      }
    }
  });

  await logAudit({
    tableName: "PurchasingProposal",
    recordId: proposal.id,
    action: "CREATE",
    newData: proposal,
    changedBy: proposer,
    changeDetail: `Tạo đề nghị mua hàng: ${proposalCode}`
  });

  revalidatePath("/purchasing/de-nghi");
  revalidatePath("/purchasing/phe-duyet-de-nghi");
  revalidatePath("/purchasing/lenh-mua");
  return proposal;
}

export async function updateProposal(id: string, formData: FormData, details: any[], attachmentsList?: any[]) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const changer = user?.employeeName || user?.username || "Hệ thống";

  const oldProposal = await (prisma as any).purchasingproposal.findUnique({
    where: { id },
    include: { items: true }
  });

  if (!oldProposal) throw new Error("Không tìm thấy đề nghị mua hàng");
  if (oldProposal.status !== "Tạo mới" && oldProposal.status !== "Từ chối") {
    throw new Error("Chỉ có thể sửa đề nghị ở trạng thái Tạo mới hoặc Từ chối");
  }

  const selectedBranch = formData.get("branch") as string;
  const purpose = formData.get("purpose") as string;
  const urgency = formData.get("urgency") as string;
  const note = formData.get("note") as string;
  const deliveryDateRaw = formData.get("deliveryDate") as string;
  const deliveryDate = deliveryDateRaw ? new Date(deliveryDateRaw) : null;
  const deliveryPlace = formData.get("deliveryPlace") as string;

  const attachmentsRaw = formData.get("attachments") as string;
  const attachments = attachmentsList ? JSON.stringify(attachmentsList) : attachmentsRaw;

  const branch = selectedBranch || oldProposal.branch;
  // If branch changes, regenerate proposalCode
  let proposalCode = oldProposal.proposalCode;
  if (branch !== oldProposal.branch) {
    proposalCode = await generateProposalCode(branch);
  }

  const now = new Date();
  const updatedProposal = await (prisma as any).purchasingproposal.update({
    where: { id },
    data: {
      proposalCode,
      branch,
      purpose,
      urgency,
      note: note || "",
      attachments: attachments || null,
      deliveryDate,
      deliveryPlace: deliveryPlace || null,
      updatedAt: now,
      items: {
        deleteMany: {},
        create: details.map(d => {
          const qty = parseFloat(d.quantity) || 0;
          const price = parseFloat(d.price) || 0;
          return {
            id: require('crypto').randomUUID(),
            productName: capitalizeFirst(d.productName),
            techStandard: capitalizeFirst(d.techStandard),
            unit: capitalizeFirst(d.unit),
            quantity: qty,
            price: price,
            amount: qty * price,
            note: d.note || "",
            createdAt: now,
            updatedAt: now
          };
        })
      }
    }
  });

  await logAudit({
    tableName: "PurchasingProposal",
    recordId: id,
    action: "UPDATE",
    oldData: oldProposal,
    newData: updatedProposal,
    changedBy: changer,
    changeDetail: `Cập nhật đề nghị mua hàng: ${proposalCode}`
  });

  revalidatePath("/purchasing/de-nghi");
  revalidatePath("/purchasing/phe-duyet-de-nghi");
  revalidatePath("/purchasing/lenh-mua");
  return updatedProposal;
}

export async function deleteProposal(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  if (!isAdmin) {
    throw new Error("Chỉ quản trị viên mới được quyền xóa đề nghị mua");
  }

  const changer = user?.employeeName || user?.username || "Hệ thống";
  const oldProposal = await (prisma as any).purchasingproposal.findUnique({ where: { id } });

  if (!oldProposal) throw new Error("Không tìm thấy đề nghị mua hàng");

  await (prisma as any).purchasingproposal.delete({ where: { id } });

  await logAudit({
    tableName: "PurchasingProposal",
    recordId: id,
    action: "DELETE",
    oldData: oldProposal,
    changedBy: changer,
    changeDetail: `Xóa đề nghị mua hàng: ${oldProposal.proposalCode}`
  });

  revalidatePath("/purchasing/de-nghi");
  revalidatePath("/purchasing/phe-duyet-de-nghi");
  revalidatePath("/purchasing/lenh-mua");
}

export async function updateProposalStatus(id: string, status: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const changer = user?.employeeName || user?.username || "Hệ thống";

  const oldProposal = await (prisma as any).purchasingproposal.findUnique({ where: { id } });
  if (!oldProposal) throw new Error("Không tìm thấy đề nghị mua hàng");

  const updatedProposal = await (prisma as any).purchasingproposal.update({
    where: { id },
    data: { status, updatedAt: new Date() }
  });

  let detailMsg = `Chuyển trạng thái đề nghị mua sang: ${status}`;
  if (status === "Chờ duyệt") {
    detailMsg = `Gửi phê duyệt đề nghị mua: ${oldProposal.proposalCode}`;
  } else if (status === "Tạo mới" && oldProposal.status === "Chờ duyệt") {
    detailMsg = `Thu hồi đề nghị mua: ${oldProposal.proposalCode}`;
  } else if (status === "Hoàn thành") {
    detailMsg = `Hoàn thành đề nghị mua: ${oldProposal.proposalCode}`;
  } else if (status === "Đã hủy") {
    detailMsg = `Hủy đề nghị mua: ${oldProposal.proposalCode}`;
  }

  await logAudit({
    tableName: "PurchasingProposal",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldProposal.status },
    newData: { status },
    changedBy: changer,
    changeDetail: detailMsg
  });

  if (status === "Chờ duyệt") {
    await (prisma as any).notification.create({
      data: {
        id: require('crypto').randomUUID(),
        title: "Phê duyệt nhu cầu mua hàng",
        message: `Đề nghị mua hàng ${oldProposal.proposalCode} của ${oldProposal.proposer} đã được gửi và đang chờ phê duyệt.`,
        link: "/phe-duyet/de-nghi-mua-hang",
        type: "APPROVAL",
        targetRole: "PERM:PD_DE_NGHI_MH,TM_PHE_DUYET_DE_NGHI",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  revalidatePath("/purchasing/de-nghi");
  revalidatePath("/purchasing/phe-duyet-de-nghi");
  revalidatePath("/purchasing/lenh-mua");
  return updatedProposal;
}

export async function getUnits() {
  return await prisma.unit.findMany({
    where: { status: "Hoạt động" },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });
}

export async function getWarehouses() {
  return await (prisma as any).warehouse.findMany({
    where: { status: "Hoạt động" }
  });
}
