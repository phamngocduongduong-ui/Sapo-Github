"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createPosition(formData: FormData) {
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const note = formData.get("note") as string;

  if (!code || !name) throw new Error("Mã và tên chức vụ là bắt buộc.");

  await prisma.position.create({
    data: { code, name, note: note || "", status: "ACTIVE" }
  });

  revalidatePath("/nhan-su/chuc-vu");
  revalidatePath("/danh-muc/chuc-vu");
}

export async function updatePosition(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const note = formData.get("note") as string;

  if (!name) throw new Error("Tên chức vụ là bắt buộc.");

  await prisma.position.update({
    where: { id },
    data: { name, note: note || "" }
  });

  revalidatePath("/nhan-su/chuc-vu");
  revalidatePath("/danh-muc/chuc-vu");
}

export async function updatePositionStatus(id: string, status: string) {
  await prisma.position.update({
    where: { id },
    data: { status }
  });
  revalidatePath("/nhan-su/chuc-vu");
  revalidatePath("/danh-muc/chuc-vu");
}
