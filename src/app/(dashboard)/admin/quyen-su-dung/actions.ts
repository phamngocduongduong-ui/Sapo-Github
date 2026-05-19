"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function saveCategoryPermissions(permissionId: string, permissions: { moduleKey: string, canAccess: boolean }[]) {
  // Đảm bảo chỉ lưu các moduleKey duy nhất và hợp lệ
  const uniquePermissions = Array.from(
    new Map(permissions.map(p => [p.moduleKey, p])).values()
  );

  await prisma.$transaction([
    // 1. Xóa các chi tiết quyền cũ
    (prisma as any).permissiondetail.deleteMany({
      where: { permissionId }
    }),
    // 2. Tạo các chi tiết quyền mới
    (prisma as any).permissiondetail.createMany({
      data: uniquePermissions.map(p => ({
        permissionId,
        moduleKey: p.moduleKey,
        canAccess: p.canAccess
      }))
    })
  ]);

  revalidatePath("/admin/quyen-su-dung");
  revalidatePath("/admin/tai-khoan");
  revalidatePath("/");
}

export async function getCategoryPermissions(permissionId: string) {
  return await (prisma as any).permissiondetail.findMany({
    where: { permissionId }
  });
}

