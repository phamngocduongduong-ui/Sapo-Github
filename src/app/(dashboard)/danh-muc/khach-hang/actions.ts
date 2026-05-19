"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function generateNextCustomerCode(classification: string) {
  const prefix = classification === "Trong nước" ? "1" : "0";
  
  const results = await (prisma as any).$queryRawUnsafe(`
    SELECT code FROM customer 
    WHERE code LIKE ? 
    ORDER BY code DESC 
    LIMIT 1
  `, `${prefix}%`);

  const lastCustomer = results && (results as any)[0];

  let nextNumber = 1;
  if (lastCustomer) {
    const lastCode = lastCustomer.code;
    const lastNumberStr = lastCode.substring(1);
    const lastNumber = parseInt(lastNumberStr, 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
}

export async function createCustomer(formData: FormData) {
  const classification = formData.get("classification") as string;
  const name = formData.get("name") as string;
  const abbreviation = formData.get("abbreviation") as string;
  const country = formData.get("country") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const address = formData.get("address") as string;

  if (!classification || !name || !abbreviation || !country) {
    throw new Error("Phân loại, Tên khách hàng, Tên viết tắt và Quốc gia là bắt buộc.");
  }

  const id = crypto.randomUUID();
  const code = await generateNextCustomerCode(classification);

  // Using raw SQL to bypass Prisma Client's outdated schema validation
  await (prisma as any).$executeRawUnsafe(`
    INSERT INTO customer (id, code, name, abbreviation, classification, country, phone, email, address, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `, id, code, name, abbreviation, classification, country, phone, email, address, "Hoạt động");

  revalidatePath("/danh-muc/khach-hang");
}

export async function updateCustomer(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const abbreviation = formData.get("abbreviation") as string;
  const country = formData.get("country") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const address = formData.get("address") as string;

  if (!name || !abbreviation || !country) {
    throw new Error("Tên khách hàng, Tên viết tắt và Quốc gia là bắt buộc.");
  }

  // Using raw SQL to bypass Prisma Client's outdated schema validation
  await (prisma as any).$executeRawUnsafe(`
    UPDATE customer 
    SET name = ?, abbreviation = ?, country = ?, phone = ?, email = ?, address = ?, updatedAt = NOW()
    WHERE id = ?
  `, name, abbreviation, country, phone, email, address, id);

  revalidatePath("/danh-muc/khach-hang");
}

export async function toggleCustomerStatus(id: string, currentStatus: string) {
  const newStatus = currentStatus === "Hoạt động" ? "Ngưng hoạt động" : "Hoạt động";
  
  await (prisma as any).$executeRawUnsafe(`
    UPDATE customer SET status = ?, updatedAt = NOW() WHERE id = ?
  `, newStatus, id);

  revalidatePath("/danh-muc/khach-hang");
}

export async function deleteCustomer(id: string) {
  await (prisma as any).$executeRawUnsafe(`
    DELETE FROM customer WHERE id = ?
  `, id);

  revalidatePath("/danh-muc/khach-hang");
}
