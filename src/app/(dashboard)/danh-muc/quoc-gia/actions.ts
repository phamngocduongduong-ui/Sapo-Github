"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createCountry(formData: FormData) {
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;

  if (!code || !name) throw new Error("Mã và tên quốc gia là bắt buộc.");

  const id = crypto.randomUUID();

  // Using raw SQL to bypass Prisma Client's outdated schema validation
  await (prisma as any).$executeRawUnsafe(`
    INSERT INTO country (id, code, name, createdAt, updatedAt)
    VALUES (?, ?, ?, NOW(), NOW())
  `, id, code, name);

  revalidatePath("/danh-muc/quoc-gia");
}

export async function updateCountry(id: string, formData: FormData) {
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;

  if (!code || !name) throw new Error("Mã và tên quốc gia là bắt buộc.");

  // Using raw SQL to bypass Prisma Client's outdated schema validation
  await (prisma as any).$executeRawUnsafe(`
    UPDATE country 
    SET code = ?, name = ?, updatedAt = NOW()
    WHERE id = ?
  `, code, name, id);

  revalidatePath("/danh-muc/quoc-gia");
}

export async function deleteCountry(id: string) {
  await (prisma as any).$executeRawUnsafe(`
    DELETE FROM country WHERE id = ?
  `, id);

  revalidatePath("/danh-muc/quoc-gia");
}
