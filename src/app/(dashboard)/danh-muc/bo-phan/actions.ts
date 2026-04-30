"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createDepartment(formData: FormData) {
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const note = formData.get("note") as string;

  if (!code || !name) throw new Error("Mã và tên bộ phận là bắt buộc.");

  await prisma.department.create({
    data: { code, name, note: note || "", status: "ACTIVE" }
  });

  revalidatePath("/danh-muc/bo-phan");
}

export async function updateDepartment(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const note = formData.get("note") as string;

  if (!name) throw new Error("Tên bộ phận là bắt buộc.");

  await prisma.department.update({
    where: { id },
    data: { name, note: note || "" }
  });

  revalidatePath("/danh-muc/bo-phan");
}

export async function updateDepartmentStatus(id: string, status: string) {
  await prisma.department.update({
    where: { id },
    data: { status }
  });
  revalidatePath("/danh-muc/bo-phan");
}
