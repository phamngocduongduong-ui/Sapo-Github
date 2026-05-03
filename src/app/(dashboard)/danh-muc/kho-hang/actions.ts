"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getWarehouses() {
  return await prisma.warehouse.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createWarehouse(formData: FormData) {
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const note = formData.get("note") as string;
  const status = formData.get("status") as string || "Hoạt động";

  if (!code || !name) throw new Error("Mã và tên kho là bắt buộc.");

  await prisma.warehouse.create({
    data: {
      code,
      name,
      note,
      status
    }
  });

  revalidatePath("/danh-muc/kho-hang");
}

export async function updateWarehouse(id: string, formData: FormData) {
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const note = formData.get("note") as string;
  const status = formData.get("status") as string;

  await prisma.warehouse.update({
    where: { id },
    data: {
      code,
      name,
      note,
      status
    }
  });

  revalidatePath("/danh-muc/kho-hang");
}

export async function updateWarehouseStatus(id: string, status: string) {
  await prisma.warehouse.update({
    where: { id },
    data: { status }
  });

  revalidatePath("/danh-muc/kho-hang");
}

export async function deleteWarehouse(id: string) {
  await prisma.warehouse.delete({
    where: { id }
  });

  revalidatePath("/danh-muc/kho-hang");
}
