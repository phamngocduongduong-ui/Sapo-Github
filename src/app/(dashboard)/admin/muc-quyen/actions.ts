"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getPermissions() {
  return await prisma.permission.findMany({
    orderBy: { createdAt: "desc" }
  });
}

export async function createPermission(formData: FormData) {
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const status = formData.get("status") as string || "ACTIVE";

  if (!code || !name) throw new Error("Mã và tên quyền là bắt buộc.");

  await prisma.permission.create({
    data: {
      id: crypto.randomUUID(),
      code,
      name,
      status
    }
  });

  revalidatePath("/admin/muc-quyen");
  revalidatePath("/admin/quyen-su-dung");
  revalidatePath("/admin/tai-khoan");
}

export async function updatePermission(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const status = formData.get("status") as string;

  if (!name) throw new Error("Tên quyền là bắt buộc.");

  await prisma.permission.update({
    where: { id },
    data: { name, status }
  });

  revalidatePath("/admin/muc-quyen");
  revalidatePath("/admin/quyen-su-dung");
  revalidatePath("/admin/tai-khoan");
}

export async function updatePermissionStatus(id: string, status: string) {
  await prisma.permission.update({
    where: { id },
    data: { status }
  });
  revalidatePath("/admin/muc-quyen");
  revalidatePath("/admin/quyen-su-dung");
  revalidatePath("/admin/tai-khoan");
}
