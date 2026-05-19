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

  const existing = await (prisma as any).materialplan.findUnique({ where: { planNumber } });
  if (existing) throw new Error("Số kế hoạch đã tồn tại.");

  const plan = await (prisma as any).materialplan.create({
    data: {
      id: crypto.randomUUID(),
      planNumber,
      creator,
      note,
      status: "Tạo mới",
      order: {
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
  const oldPlan = await (prisma as any).materialplan.findUnique({ where: { id } });

  if (!oldPlan) throw new Error("Kế hoạch không tồn tại.");
  if (oldPlan.status === "Đã duyệt") {
    throw new Error("Không thể chỉnh sửa kế hoạch đã được phê duyệt.");
  }

  const updatedPlan = await (prisma as any).materialplan.update({
    where: { id },
    data: {
      note,
      status,
      order: {
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
  const plan = await (prisma as any).materialplan.findUnique({ where: { id } });
  if (plan?.status === "Đã duyệt") throw new Error("Không thể xóa kế hoạch đã phê duyệt.");
  
  await (prisma as any).materialplan.delete({ where: { id } });
  revalidatePath("/production/ke-hoach-vat-tu");
}

export async function updateMaterialPlanStatus(id: string, status: string) {
  const session = await getSession();
  const oldPlan = await (prisma as any).materialplan.findUnique({ where: { id } });

  const updatedPlan = await (prisma as any).materialplan.update({
    where: { id },
    data: { status }
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "MaterialPlan",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: oldPlan,
    newData: updatedPlan,
    changedBy,
    changeDetail: `Chuyển trạng thái kế hoạch vật tư sang: ${status}`
  });

  revalidatePath("/production/ke-hoach-vat-tu");
}
