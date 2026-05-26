"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

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

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const userBranches = user?.branch ? user.branch.split(",").map((b: string) => b.trim()).filter(Boolean) : [];

  const proposals = await (prisma as any).maintenanceproposal.findMany({
    where: isAdmin ? {} : {
      branch: { in: userBranches }
    },
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

  const prefix = `BT${branchCode}`;
  const proposals = await (prisma as any).maintenanceproposal.findMany({
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

export async function createProposal(formData: FormData, details: any[]) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const proposer = user?.employeeName || user?.username || "Hệ thống";

  const selectedBranch = formData.get("branch") as string;
  const purpose = formData.get("purpose") as string;
  const urgency = formData.get("urgency") as string;
  const note = formData.get("note") as string;

  const branch = selectedBranch || user?.branch?.split(",")[0].trim() || "";
  const proposalCode = await generateProposalCode(branch);

  const id = require('crypto').randomUUID();
  const now = new Date();

  const proposal = await (prisma as any).maintenanceproposal.create({
    data: {
      id,
      proposalCode,
      proposer,
      branch,
      purpose,
      urgency,
      note: note || "",
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
    tableName: "MaintenanceProposal",
    recordId: proposal.id,
    action: "CREATE",
    newData: proposal,
    changedBy: proposer,
    changeDetail: `Tạo đề nghị mua bảo trì: ${proposalCode}`
  });

  revalidatePath("/maintenance/de-nghi-mua");
  revalidatePath("/maintenance/phe-duyet");
  revalidatePath("/purchasing/lenh-mua");
  return proposal;
}

export async function updateProposal(id: string, formData: FormData, details: any[]) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const changer = user?.employeeName || user?.username || "Hệ thống";

  const oldProposal = await (prisma as any).maintenanceproposal.findUnique({
    where: { id },
    include: { items: true }
  });

  if (!oldProposal) throw new Error("Không tìm thấy đề nghị mua bảo trì");
  if (oldProposal.status !== "Tạo mới" && oldProposal.status !== "Từ chối") {
    throw new Error("Chỉ có thể sửa đề nghị ở trạng thái Tạo mới hoặc Từ chối");
  }

  const selectedBranch = formData.get("branch") as string;
  const purpose = formData.get("purpose") as string;
  const urgency = formData.get("urgency") as string;
  const note = formData.get("note") as string;

  const branch = selectedBranch || oldProposal.branch;
  // If branch changes, regenerate proposalCode
  let proposalCode = oldProposal.proposalCode;
  if (branch !== oldProposal.branch) {
    proposalCode = await generateProposalCode(branch);
  }

  const now = new Date();
  const updatedProposal = await (prisma as any).maintenanceproposal.update({
    where: { id },
    data: {
      proposalCode,
      branch,
      purpose,
      urgency,
      note: note || "",
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
    tableName: "MaintenanceProposal",
    recordId: id,
    action: "UPDATE",
    oldData: oldProposal,
    newData: updatedProposal,
    changedBy: changer,
    changeDetail: `Cập nhật đề nghị mua bảo trì: ${proposalCode}`
  });

  revalidatePath("/maintenance/de-nghi-mua");
  revalidatePath("/maintenance/phe-duyet");
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
  const oldProposal = await (prisma as any).maintenanceproposal.findUnique({ where: { id } });

  if (!oldProposal) throw new Error("Không tìm thấy đề nghị mua bảo trì");

  await (prisma as any).maintenanceproposal.delete({ where: { id } });

  await logAudit({
    tableName: "MaintenanceProposal",
    recordId: id,
    action: "DELETE",
    oldData: oldProposal,
    changedBy: changer,
    changeDetail: `Xóa đề nghị mua bảo trì: ${oldProposal.proposalCode}`
  });

  revalidatePath("/maintenance/de-nghi-mua");
  revalidatePath("/maintenance/phe-duyet");
  revalidatePath("/purchasing/lenh-mua");
}

export async function updateProposalStatus(id: string, status: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const changer = user?.employeeName || user?.username || "Hệ thống";

  const oldProposal = await (prisma as any).maintenanceproposal.findUnique({ where: { id } });
  if (!oldProposal) throw new Error("Không tìm thấy đề nghị mua bảo trì");

  const updatedProposal = await (prisma as any).maintenanceproposal.update({
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
    tableName: "MaintenanceProposal",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldProposal.status },
    newData: { status },
    changedBy: changer,
    changeDetail: detailMsg
  });

  revalidatePath("/maintenance/de-nghi-mua");
  revalidatePath("/maintenance/phe-duyet");
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
