"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createCustomer(formData: FormData) {
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const address = formData.get("address") as string;

  if (!code || !name) throw new Error("Mã và tên khách hàng là bắt buộc.");

  await prisma.customer.create({
    data: { code, name, phone, email, address },
  });

  revalidatePath("/danh-muc/khach-hang");
}

export async function updateCustomer(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const address = formData.get("address") as string;

  if (!name) throw new Error("Tên khách hàng là bắt buộc.");

  await prisma.customer.update({
    where: { id },
    data: { name, phone, email, address },
  });

  revalidatePath("/danh-muc/khach-hang");
}
