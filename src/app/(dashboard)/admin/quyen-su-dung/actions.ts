"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function saveCategoryPermissions(permissionId: string, permissions: { moduleKey: string, canAccess: boolean }[]) {
  // Xóa các chi tiết quyền cũ của danh mục này
  await (prisma as any).permissiondetail.deleteMany({
    where: { permissionId }
  });

  // Tạo các chi tiết quyền mới
  await (prisma as any).permissiondetail.createMany({
    data: permissions.map(p => ({
      permissionId,
      moduleKey: p.moduleKey,
      canAccess: p.canAccess
    }))
  });

  revalidatePath("/admin/quyen-su-dung");
}

export async function getCategoryPermissions(permissionId: string) {
  return await (prisma as any).permissiondetail.findMany({
    where: { permissionId }
  });
}

