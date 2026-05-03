"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function createMaterialPlan(formData: FormData, orderIds: string[]) {
  const planNumber = formData.get("planNumber") as string;
  const creator = formData.get("creator") as string;
  const note = formData.get("note") as string;

  if (!planNumber || orderIds.length === 0) {
    throw new Error("Vui lòng nhập số kế hoạch và chọn ít nhất một đơn hàng.");
  }

  const existing = await prisma.materialPlan.findUnique({ where: { planNumber } });
  if (existing) throw new Error("Số kế hoạch đã tồn tại.");

  const plan = await prisma.materialPlan.create({
    data: {
      planNumber,
      creator,
      note,
      status: "Tạo mới",
      orders: {
        connect: orderIds.map(id => ({ id }))
      }
    },
  });

  const session = await getSession();
  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "MaterialPlan",
    recordId: plan.id,
    action: "CREATE",
    newData: plan,
    changedBy,
    changeDetail: `Tạo kế hoạch vật tư mới: ${planNumber}`
  });

  revalidatePath("/production/ke-hoach-vat-tu");
}

export async function updateMaterialPlan(id: string, formData: FormData, orderIds: string[]) {
  const note = formData.get("note") as string;
  const status = formData.get("status") as string;

  // Ngắt kết nối các đơn hàng cũ và kết nối đơn hàng mới
  const session = await getSession();
  const oldPlan = await prisma.materialPlan.findUnique({ where: { id } });

  const updatedPlan = await prisma.materialPlan.update({
    where: { id },
    data: {
      note,
      status,
      orders: {
        set: orderIds.map(id => ({ id }))
      }
    }
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "MaterialPlan",
    recordId: id,
    action: status !== oldPlan?.status ? "STATUS_CHANGE" : "UPDATE",
    oldData: oldPlan,
    newData: updatedPlan,
    changedBy,
    changeDetail: status !== oldPlan?.status 
      ? `Chuyển trạng thái kế hoạch vật tư sang: ${status}`
      : "Cập nhật thông tin kế hoạch vật tư"
  });

  revalidatePath("/production/ke-hoach-vat-tu");
}

export async function deleteMaterialPlan(id: string) {
  await prisma.materialPlan.delete({ where: { id } });
  revalidatePath("/production/ke-hoach-vat-tu");
}
