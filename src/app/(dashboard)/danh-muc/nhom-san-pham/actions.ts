"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getProductCategories() {
  return await (prisma as any).productcategory.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createProductCategory(formData: FormData) {
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const status = formData.get("status") as string || "Hoạt động";

  if (!code || !name) throw new Error("Mã và tên nhóm là bắt buộc.");

  await (prisma as any).productcategory.create({
    data: {
      code,
      name,
      description,
      status
    }
  });

  revalidatePath("/danh-muc/nhom-san-pham");
}

export async function updateProductCategory(id: string, formData: FormData) {
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const status = formData.get("status") as string;

  await (prisma as any).productcategory.update({
    where: { id },
    data: {
      code,
      name,
      description,
      status
    }
  });

  revalidatePath("/danh-muc/nhom-san-pham");
}

export async function updateCategoryStatus(id: string, status: string) {
  await (prisma as any).productcategory.update({
    where: { id },
    data: { status }
  });

  revalidatePath("/danh-muc/nhom-san-pham");
}

export async function deleteProductCategory(id: string) {
  await (prisma as any).productcategory.delete({
    where: { id }
  });

  revalidatePath("/danh-muc/nhom-san-pham");
}
