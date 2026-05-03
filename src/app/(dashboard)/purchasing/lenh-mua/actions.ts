"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

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


export async function createPurchaseOrder(formData: FormData, details: any[]) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const creator = user?.employeeName || user?.username || "Hệ thống";


  const requestedDate = formData.get("requestedDate") as string;
  const purpose = formData.get("purpose") as string;
  const note = formData.get("note") as string;
  const selectedBranch = formData.get("branch") as string;
  const deliveryLocation = formData.get("deliveryLocation") as string;

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
      status: "Tạo mới",
      updatedAt: now,
      purchaseorderdetail: {
        create: details.map(d => ({
          id: require('crypto').randomUUID(),
          productCode: d.productCode,
          productName: d.productName,
          requestedQuantity: parseFloat(d.requestedQuantity) || 0,
          unit: d.unit || "",
          note: d.note || "",
          updatedAt: now
        }))
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

  const now = new Date();
  const updatedPO = await (prisma as any).purchaseorder.update({
    where: { id },
    data: {
      requestedDate: new Date(requestedDate),
      purpose,
      note: note || "",
      deliveryLocation: deliveryLocation || "",
      updatedAt: now,
      purchaseorderdetail: {
        deleteMany: {},
        create: details.map(d => ({
          id: require('crypto').randomUUID(),
          productCode: d.productCode,
          productName: d.productName,
          requestedQuantity: parseFloat(d.requestedQuantity) || 0,
          unit: d.unit || "",
          note: d.note || "",
          updatedAt: now
        }))
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
  const oldPO = await (prisma as any).purchaseorder.findUnique({ where: { id } });

  await (prisma as any).purchaseorder.delete({ where: { id } });

  const user = await (prisma as any).user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "PurchaseOrder",
    recordId: id,
    action: "DELETE",
    oldData: oldPO,
    changedBy,
    changeDetail: `Xóa lệnh mua: ${oldPO?.poCode}`
  });

  revalidatePath("/purchasing/lenh-mua");
}
