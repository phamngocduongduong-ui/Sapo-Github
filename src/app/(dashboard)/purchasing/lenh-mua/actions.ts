"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function getBranches() {
  return await (prisma as any).branch.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" }
  });
}

export async function getPurchaseOrders() {
  const session = await getSession();
  if (!session) return [];

  const user = await (prisma as any).user.findUnique({
    where: { id: session.userId }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const userBranches = user?.branch ? user.branch.split(",").map(b => b.trim()).filter(Boolean) : [];

  return await (prisma as any).purchaseorder.findMany({
    where: isAdmin ? {} : {
      branch: { in: userBranches }
    },
    include: { purchaseorderdetail: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPheDuyetPurchaseOrders() {
  const session = await getSession();
  if (!session) return [];

  const user = await (prisma as any).user.findUnique({
    where: { id: session.userId }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const userBranches = user?.branch ? user.branch.split(",").map(b => b.trim()).filter(Boolean) : [];

  return await (prisma as any).purchaseorder.findMany({
    where: {
      branch: isAdmin ? undefined : { in: userBranches },
      status: { in: ["Chờ phê duyệt", "Chờ thực hiện", "Đã phê duyệt"] }
    },
    include: { purchaseorderdetail: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProducts() {
  return await (prisma as any).product.findMany({
    include: { unit: true }
  });
}

export async function getWarehouses() {
  return await (prisma as any).warehouse.findMany({
    where: { status: "Hoạt động" }
  });
}

async function generatePOCode(branchName: string) {
  if (!branchName) return "";
  // branchName can be multiple branches like "HCM, HN", take the first one or exact match
  const firstBranchName = branchName.split(",")[0].trim();
  const branch = await (prisma as any).branch.findFirst({ where: { name: firstBranchName } });
  if (!branch) return "";

  const orders = await (prisma as any).purchaseorder.findMany({
    where: { poCode: { contains: `/${branch.code}` } },
    select: { poCode: true }
  });

  const nums = orders
    .map((o: any) => {
      const parts = o.poCode.split("/");
      const prefixPart = parts[0]; // e.g. "PO-0001"
      const numPart = prefixPart.includes("-") ? prefixPart.split("-")[1] : prefixPart.substring(2);
      return parseInt(numPart);
    })
    .filter((n: any) => !isNaN(n));

  const max = nums.length > 0 ? Math.max(...nums) : 0;
  const nextNum = (max + 1).toString().padStart(4, "0");

  return `PO-${nextNum}/${branch.code}`;
}


export async function getSuppliers() {
  return await (prisma as any).supplier.findMany({
    where: {
      status: "Hoạt động"
    },
    orderBy: { name: "asc" }
  });
}

function extractProposalCode(purpose: string | null): string | null {
  if (!purpose || !purpose.includes("đề xuất ")) return null;
  const parts = purpose.split("đề xuất ");
  return parts.length > 1 ? parts[1].trim() : null;
}

export async function syncProposalStatus(proposalCode: string) {
  const session = await getSession();
  const user = await (prisma as any).user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  // 1. Fetch proposal and its items
  const proposal = await (prisma as any).maintenanceproposal.findUnique({
    where: { proposalCode },
    include: { items: true }
  });

  if (!proposal) return;

  // 2. Fetch all PO details linked to this proposalCode
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
      requestedQuantity: true
    }
  });

  // 3. Check if all items are fully purchased
  let isFullyPurchased = true;
  if (proposal.items.length === 0) {
    isFullyPurchased = false;
  }

  for (const item of proposal.items) {
    const orderedQty = poDetails
      .filter((d: any) => d.proposalProductName === item.productName)
      .reduce((sum: number, d: any) => sum + (d.requestedQuantity || 0), 0);

    if (orderedQty < item.quantity) {
      isFullyPurchased = false;
      break;
    }
  }

  // 4. Update the proposal status accordingly
  if (proposal.status === "Đã phê duyệt" || proposal.status === "Hoàn thành") {
    const newStatus = isFullyPurchased ? "Hoàn thành" : "Đã phê duyệt";
    if (proposal.status !== newStatus) {
      await (prisma as any).maintenanceproposal.update({
        where: { id: proposal.id },
        data: { status: newStatus, updatedAt: new Date() }
      });

      await logAudit({
        tableName: "MaintenanceProposal",
        recordId: proposal.id,
        action: "STATUS_CHANGE",
        oldData: { status: proposal.status },
        newData: { status: newStatus },
        changedBy,
        changeDetail: newStatus === "Hoàn thành"
          ? `Tự động chuyển trạng thái sang Hoàn thành do mua đủ`
          : `Tự động chuyển trạng thái sang Đề nghị chờ đặt (Đã phê duyệt) do chưa mua đủ`
      });
    }
  }
}

export async function syncProposalStatusByPO(purpose: string | null) {
  const proposalCode = extractProposalCode(purpose);
  if (proposalCode) {
    await syncProposalStatus(proposalCode);
  }
}

export async function createPurchaseOrder(formData: FormData, details: any[], initialStatus: string = "Tạo mới") {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const creator = user?.employeeName || user?.username || "Hệ thống";

  const requestedDate = formData.get("requestedDate") as string;
  const purpose = formData.get("purpose") as string;
  const note = formData.get("note") as string;
  const selectedBranch = formData.get("branch") as string;
  const deliveryLocation = formData.get("deliveryLocation") as string;
  const supplier = formData.get("supplier") as string;

  const branch = selectedBranch || user?.branch?.split(",")[0].trim() || "";
  const poCode = await generatePOCode(branch);

  const id = require('crypto').randomUUID();
  const now = new Date();

  const po = await (prisma as any).purchaseorder.create({
    data: {
      id,
      poCode,
      creator,
      branch,
      requestedDate: new Date(requestedDate),
      purpose,
      note: note || "",
      deliveryLocation: deliveryLocation || "",
      supplier: supplier || null,
      status: initialStatus,
      updatedAt: now,
      purchaseorderdetail: {
        create: details.map(d => {
          const reqQty = parseFloat(d.requestedQuantity) || 0;
          const uPrice = parseFloat(d.price) || 0;
          const propQty = d.proposalQuantity !== undefined && d.proposalQuantity !== null ? parseFloat(d.proposalQuantity) : null;
          return {
            id: require('crypto').randomUUID(),
            productCode: d.productCode,
            productName: d.productName,
            proposalProductName: d.proposalProductName || d.originalProposalProductName || null,
            requestedQuantity: reqQty,
            proposalQuantity: propQty,
            price: uPrice,
            amount: reqQty * uPrice,
            unit: d.unit || "",
            note: d.note || "",
            updatedAt: now
          };
        })
      }
    }
  });

  await logAudit({
    tableName: "PurchaseOrder",
    recordId: po.id,
    action: "CREATE",
    newData: po,
    changedBy: creator,
    changeDetail: `Tạo lệnh mua mới: ${poCode}`
  });

  await syncProposalStatusByPO(po.purpose);

  revalidatePath("/purchasing/lenh-mua");
  return po;
}

export async function updatePurchaseOrder(id: string, formData: FormData, details: any[]) {
  const session = await getSession();
  const oldPO = await (prisma as any).purchaseorder.findUnique({ 
    where: { id },
    include: { purchaseorderdetail: true }
  });

  const requestedDate = formData.get("requestedDate") as string;
  const purpose = formData.get("purpose") as string;
  const note = formData.get("note") as string;
  const deliveryLocation = formData.get("deliveryLocation") as string;
  const supplier = formData.get("supplier") as string;

  const now = new Date();
  const updatedPO = await (prisma as any).purchaseorder.update({
    where: { id },
    data: {
      requestedDate: new Date(requestedDate),
      purpose,
      note: note || "",
      deliveryLocation: deliveryLocation || "",
      supplier: supplier || null,
      updatedAt: now,
      purchaseorderdetail: {
        deleteMany: {},
        create: details.map(d => {
          const reqQty = parseFloat(d.requestedQuantity) || 0;
          const uPrice = parseFloat(d.price) || 0;
          const propQty = d.proposalQuantity !== undefined && d.proposalQuantity !== null ? parseFloat(d.proposalQuantity) : null;
          return {
            id: require('crypto').randomUUID(),
            productCode: d.productCode,
            productName: d.productName,
            proposalProductName: d.proposalProductName || d.originalProposalProductName || null,
            requestedQuantity: reqQty,
            proposalQuantity: propQty,
            price: uPrice,
            amount: reqQty * uPrice,
            unit: d.unit || "",
            note: d.note || "",
            updatedAt: now
          };
        })
      }
    }
  });

  const user = await (prisma as any).user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "PurchaseOrder",
    recordId: id,
    action: "UPDATE",
    oldData: oldPO,
    newData: updatedPO,
    changedBy,
    changeDetail: `Cập nhật lệnh mua: ${updatedPO.poCode}`
  });

  await syncProposalStatusByPO(oldPO?.purpose);
  if (updatedPO.purpose !== oldPO?.purpose) {
    await syncProposalStatusByPO(updatedPO.purpose);
  }

  revalidatePath("/purchasing/lenh-mua");
}



export async function updatePOStatus(id: string, status: string) {
  const session = await getSession();
  const oldPO = await (prisma as any).purchaseorder.findUnique({ where: { id } });

  const updatedPO = await (prisma as any).purchaseorder.update({
    where: { id },
    data: { status, updatedAt: new Date() }
  });

  const user = await (prisma as any).user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "PurchaseOrder",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldPO?.status },
    newData: { status },
    changedBy,
    changeDetail: `Chuyển trạng thái lệnh mua sang: ${status}`
  });

  revalidatePath("/purchasing/lenh-mua");
}

export async function deletePurchaseOrder(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  if (!isAdmin) throw new Error("Chỉ tài khoản Admin mới có quyền xóa đơn mua hàng");

  const oldPO = await (prisma as any).purchaseorder.findUnique({ where: { id } });
  if (!oldPO) throw new Error("Không tìm thấy đơn mua hàng cần xóa");

  await (prisma as any).purchaseorder.delete({ where: { id } });

  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "PurchaseOrder",
    recordId: id,
    action: "DELETE",
    oldData: oldPO,
    changedBy,
    changeDetail: `Xóa đơn mua hàng: ${oldPO?.poCode}`
  });

  await syncProposalStatusByPO(oldPO?.purpose);

  revalidatePath("/purchasing/lenh-mua");
}

export async function getMaintenanceProposals() {
  const session = await getSession();
  if (!session) return [];

  const user = await (prisma as any).user.findUnique({
    where: { id: session.userId }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const userBranches = user?.branch ? user.branch.split(",").map(b => b.trim()).filter(Boolean) : [];

  const proposals = await (prisma as any).maintenanceproposal.findMany({
    where: isAdmin ? {} : {
      branch: { in: userBranches }
    },
    include: { items: true },
    orderBy: { createdAt: "desc" }
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

export async function createPOFromProposal(proposalId: string, formData: FormData, details: any[]) {
  // First, create the purchase order
  const po = await createPurchaseOrder(formData, details, "Chờ giao hàng");

  // Log audit trail for MaintenanceProposal
  const session = await getSession();
  const user = await (prisma as any).user.findUnique({ where: { id: session?.userId || "" } });
  const creator = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "MaintenanceProposal",
    recordId: proposalId,
    action: "UPDATE",
    newData: null,
    changedBy: creator,
    changeDetail: `Đã lập đơn mua hàng từ đề nghị (Đơn mua: ${po.poCode})`
  });

  revalidatePath("/purchasing/lenh-mua");
  revalidatePath("/maintenance/de-nghi-mua");
  return po;
}

export async function completeProposal(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  const oldProposal = await (prisma as any).maintenanceproposal.findUnique({ where: { id } });
  if (!oldProposal) throw new Error("Không tìm thấy đề nghị mua bảo trì");

  const updatedProposal = await (prisma as any).maintenanceproposal.update({
    where: { id },
    data: { status: "Hoàn thành", updatedAt: new Date() }
  });

  await logAudit({
    tableName: "MaintenanceProposal",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldProposal.status },
    newData: { status: "Hoàn thành" },
    changedBy,
    changeDetail: `Xác nhận Hoàn thành trực tiếp từ Đơn mua hàng`
  });

  revalidatePath("/purchasing/lenh-mua");
  revalidatePath("/maintenance/de-nghi-mua");
  revalidatePath("/maintenance/phe-duyet");

  return updatedProposal;
}
