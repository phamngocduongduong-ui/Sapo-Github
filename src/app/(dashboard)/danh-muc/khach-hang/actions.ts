"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function generateNextCustomerCode(classification?: string) {
  const results = await (prisma as any).$queryRawUnsafe(`
    SELECT code FROM customer 
    WHERE code LIKE '%.HCM'
  `);

  let maxNumber = 0;
  if (results && results.length > 0) {
    for (const row of results) {
      const code = row.code || "";
      const match = code.match(/^(\d{4})\.HCM$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  }

  const nextNumber = maxNumber + 1;
  return `${nextNumber.toString().padStart(4, '0')}.HCM`;
}

export async function createCustomer(formData: FormData) {
  const classification = formData.get("classification") as string;
  const name = (formData.get("name") as string || "").trim().toUpperCase();
  const abbreviation = (formData.get("abbreviation") as string || "").trim().toUpperCase();
  const country = formData.get("country") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const address = (formData.get("address") as string || "").trim().toUpperCase();
  const representative = (formData.get("representative") as string || "").trim().toUpperCase();

  if (!classification || !name || !abbreviation || !country || !representative) {
    throw new Error("Phân loại, Tên khách hàng, Tên viết tắt, Quốc gia và Người đại diện là bắt buộc.");
  }

  // Generate code on the server side to guarantee correctness
  const code = await generateNextCustomerCode();

  // Check unique code
  const existing = await (prisma as any).$queryRawUnsafe(`
    SELECT id FROM customer WHERE code = ? LIMIT 1
  `, code);
  if (existing && existing.length > 0) {
    throw new Error("Mã khách hàng này đã tồn tại trong hệ thống. Vui lòng thử lại.");
  }

  const id = crypto.randomUUID();

  // Using raw SQL to bypass Prisma Client's outdated schema validation
  await (prisma as any).$executeRawUnsafe(`
    INSERT INTO customer (id, code, name, abbreviation, classification, country, phone, email, address, representative, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `, id, code, name, abbreviation, classification, country, phone, email, address, representative, "Hoạt động");

  revalidatePath("/danh-muc/khach-hang");
}

export async function updateCustomer(id: string, formData: FormData) {
  const name = (formData.get("name") as string || "").trim().toUpperCase();
  const abbreviation = (formData.get("abbreviation") as string || "").trim().toUpperCase();
  const country = formData.get("country") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const address = (formData.get("address") as string || "").trim().toUpperCase();
  const representative = (formData.get("representative") as string || "").trim().toUpperCase();

  if (!name || !abbreviation || !country || !representative) {
    throw new Error("Tên khách hàng, Tên viết tắt, Quốc gia và Người đại diện là bắt buộc.");
  }

  // Retrieve the existing customer to get their original code and ensure it cannot be changed
  const existing = await (prisma as any).$queryRawUnsafe(`
    SELECT code FROM customer WHERE id = ? LIMIT 1
  `, id);
  if (!existing || existing.length === 0) {
    throw new Error("Không tìm thấy khách hàng.");
  }
  const code = existing[0].code;

  // Using raw SQL to bypass Prisma Client's outdated schema validation
  await (prisma as any).$executeRawUnsafe(`
    UPDATE customer 
    SET code = ?, name = ?, abbreviation = ?, country = ?, phone = ?, email = ?, address = ?, representative = ?, updatedAt = NOW()
    WHERE id = ?
  `, code, name, abbreviation, country, phone, email, address, representative, id);

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

export async function checkCustomerHasOrders(code: string): Promise<boolean> {
  const results = await (prisma as any).$queryRawUnsafe(`
    SELECT id FROM \`order\` WHERE customerCode = ? LIMIT 1
  `, code);
  return results && (results as any).length > 0;
}

export async function bulkReplaceCustomers(data: any[]) {
  // Delete all existing customers
  await (prisma as any).$executeRawUnsafe(`DELETE FROM customer`);

  // Insert the new customers
  for (const item of data) {
    const id = crypto.randomUUID();
    const code = (item.code || "").trim().toUpperCase();
    const name = (item.name || "").trim().toUpperCase();
    const abbreviation = (item.abbreviation || "").trim().toUpperCase();
    const classification = item.classification || "Quốc tế";
    const country = item.country || "Việt Nam";
    const phone = item.phone || "";
    const email = item.email || "";
    const address = (item.address || "").trim().toUpperCase();
    const representative = (item.representative || "").trim().toUpperCase();
    const status = item.status || "Hoạt động";

    await (prisma as any).$executeRawUnsafe(`
      INSERT INTO customer (id, code, name, abbreviation, classification, country, phone, email, address, representative, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, id, code, name, abbreviation, classification, country, phone, email, address, representative, status);
  }

  revalidatePath("/danh-muc/khach-hang");
}
