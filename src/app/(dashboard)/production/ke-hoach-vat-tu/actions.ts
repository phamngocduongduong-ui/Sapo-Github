"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createMaterialPlan(formData: FormData, orderIds: string[]) {
  const planNumber = formData.get("planNumber") as string;
  const creator = formData.get("creator") as string;
  const note = formData.get("note") as string;

  if (!planNumber || orderIds.length === 0) {
    throw new Error("Vui lòng nhập số kế hoạch và chọn ít nhất một đơn hàng.");
  }

  const existing = await prisma.materialPlan.findUnique({ where: { planNumber } });
  if (existing) throw new Error("Số kế hoạch đã tồn tại.");

  await prisma.materialPlan.create({
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

  revalidatePath("/production/ke-hoach-vat-tu");
}

export async function updateMaterialPlan(id: string, formData: FormData, orderIds: string[]) {
  const note = formData.get("note") as string;
  const status = formData.get("status") as string;

  // Ngắt kết nối các đơn hàng cũ và kết nối đơn hàng mới
  await prisma.materialPlan.update({
    where: { id },
    data: {
      note,
      status,
      orders: {
        set: orderIds.map(id => ({ id }))
      }
    }
  });

  revalidatePath("/production/ke-hoach-vat-tu");
}

export async function deleteMaterialPlan(id: string) {
  await prisma.materialPlan.delete({ where: { id } });
  revalidatePath("/production/ke-hoach-vat-tu");
}
