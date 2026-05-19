"use server";

import { prisma } from "@/lib/db";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

async function createAuditLog(tableName: string, recordId: string, action: string, oldData: any, newData: any, changeDetail: string) {
  const session = await getSession();
  const username = session?.username || "Unknown";
  await (prisma as any).auditlog.create({
    data: {
      tableName,
      recordId,
      action,
      oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
      newData: newData ? JSON.parse(JSON.stringify(newData)) : null,
      changedBy: username,
      changeDetail,
    },
  });
}

export async function getUnits() {
  return await prisma.unit.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createUnit(formData: FormData) {
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const status = formData.get("status") as string;
  const note = formData.get("note") as string;

  const unit = await prisma.unit.create({
    data: {
      id: crypto.randomUUID(),
      code,
      name,
      status,
      note
    },
  });

  await createAuditLog("Unit", unit.id, "CREATE", null, unit, `Thêm mới đơn vị tính: ${name}`);
  revalidatePath("/danh-muc/don-vi-tinh");
  return unit;
}

export async function updateUnit(id: string, formData: FormData) {
  const oldUnit = await prisma.unit.findUnique({ where: { id } });
  
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const status = formData.get("status") as string;
  const note = formData.get("note") as string;

  const unit = await prisma.unit.update({
    where: { id },
    data: { code, name, status, note },
  });

  await createAuditLog("Unit", id, "UPDATE", oldUnit, unit, `Cập nhật đơn vị tính: ${name}`);
  revalidatePath("/danh-muc/don-vi-tinh");
  return unit;
}

export async function updateUnitStatus(id: string, status: string) {
  const oldUnit = await prisma.unit.findUnique({ where: { id } });
  const unit = await prisma.unit.update({
    where: { id },
    data: { status },
  });

  await createAuditLog("Unit", id, "STATUS_CHANGE", oldUnit, unit, `Thay đổi trạng thái đơn vị tính: ${status}`);
  revalidatePath("/danh-muc/don-vi-tinh");
  return unit;
}

export async function deleteUnit(id: string) {
  const oldUnit = await prisma.unit.findUnique({ where: { id } });
  await prisma.unit.delete({ where: { id } });

  await createAuditLog("Unit", id, "DELETE", oldUnit, null, `Xóa đơn vị tính: ${oldUnit?.name}`);
  revalidatePath("/danh-muc/don-vi-tinh");
}
