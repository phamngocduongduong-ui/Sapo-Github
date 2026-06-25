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

export async function importCustomers(data: any[], mode: "append" | "replace") {
  // Retrieve countries list for code resolution
  const dbCountries = await (prisma as any).$queryRawUnsafe(`SELECT code, name FROM country`);

  // Helper function to resolve country
  function resolveCountry(inputCountry: string): string {
    if (!inputCountry) return "Việt Nam";
    const normalized = inputCountry.toString().trim().toLowerCase();
    if (normalized === "vn" || normalized === "viet nam" || normalized === "việt nam" || normalized === "vietnam") {
      return "Việt Nam";
    }
    const match = dbCountries.find((c: any) => 
      c.code.toLowerCase() === normalized || 
      c.name.toLowerCase() === normalized
    );
    return match ? match.name : inputCountry.toString().trim();
  }

  // Helper function to resolve classification
  function resolveClassification(inputClass: string): string {
    if (!inputClass) return "Quốc tế";
    const normalized = inputClass.toString().trim().toLowerCase();
    if (normalized === "trong nước" || normalized === "trong nuoc" || normalized === "tn" || normalized === "domestic") {
      return "Trong nước";
    }
    if (normalized === "quốc tế" || normalized === "quoc te" || normalized === "qt" || normalized === "international") {
      return "Quốc tế";
    }
    return "Quốc tế"; // Default fallback
  }

  // Helper function to resolve status
  function resolveStatus(inputStatus: string): string {
    if (!inputStatus) return "Hoạt động";
    const normalized = inputStatus.toString().trim().toLowerCase();
    if (normalized === "ngưng hoạt động" || normalized === "ngung hoat dong" || normalized === "inactive" || normalized === "n" || normalized === "no" || normalized === "ngừng sử dụng" || normalized === "ngung su dung") {
      return "Ngưng hoạt động";
    }
    return "Hoạt động"; // Default fallback is "Hoạt động"
  }

  if (mode === "replace") {
    // 1. Delete all existing customers
    await (prisma as any).$executeRawUnsafe(`DELETE FROM customer`);

    let count = 0;
    // 2. Insert all customers with codes starting from 0001.HCM
    for (const item of data) {
      count++;
      const id = crypto.randomUUID();
      const code = `${count.toString().padStart(4, '0')}.HCM`;
      const name = (item.name || "").toString().trim().toUpperCase();
      const abbreviation = (item.abbreviation || "").toString().trim().toUpperCase();
      const classification = resolveClassification(item.classification);
      const country = resolveCountry(item.country);
      const phone = (item.phone || "").toString().trim();
      const email = (item.email || "").toString().trim();
      const address = (item.address || "").toString().trim().toUpperCase();
      const representative = (item.representative || "").toString().trim().toUpperCase();
      const status = resolveStatus(item.status);

      await (prisma as any).$executeRawUnsafe(`
        INSERT INTO customer (id, code, name, abbreviation, classification, country, phone, email, address, representative, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, id, code, name, abbreviation, classification, country, phone, email, address, representative, status);
    }
  } else {
    // mode === "append"
    // 1. Find all existing customers to check matches
    const existingCustomers = await (prisma as any).$queryRawUnsafe(`
      SELECT id, code, name FROM customer
    `);

    // Let's keep track of maxNumber for generating new codes
    let maxNumber = 0;
    for (const ec of existingCustomers) {
      const match = ec.code.match(/^(\d{4})\.HCM$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }

    let newCodeOffset = 0;

    for (const item of data) {
      const name = (item.name || "").toString().trim().toUpperCase();
      if (!name) continue; // Skip if no name

      // Check if a customer already exists with same name or code
      const inputCode = (item.code || "").toString().trim().toUpperCase();
      
      let matchedEC = existingCustomers.find((ec: any) => 
        (inputCode && ec.code === inputCode) || 
        ec.name.toUpperCase() === name
      );

      const abbreviation = (item.abbreviation || "").toString().trim().toUpperCase();
      const classification = resolveClassification(item.classification);
      const country = resolveCountry(item.country);
      const phone = (item.phone || "").toString().trim();
      const email = (item.email || "").toString().trim();
      const address = (item.address || "").toString().trim().toUpperCase();
      const representative = (item.representative || "").toString().trim().toUpperCase();
      const status = resolveStatus(item.status);

      if (matchedEC) {
        // Update existing customer
        await (prisma as any).$executeRawUnsafe(`
          UPDATE customer 
          SET name = ?, abbreviation = ?, classification = ?, country = ?, phone = ?, email = ?, address = ?, representative = ?, status = ?, updatedAt = NOW()
          WHERE id = ?
        `, name, abbreviation, classification, country, phone, email, address, representative, status, matchedEC.id);
      } else {
        // Insert new customer
        newCodeOffset++;
        const nextNumber = maxNumber + newCodeOffset;
        const code = `${nextNumber.toString().padStart(4, '0')}.HCM`;
        const id = crypto.randomUUID();

        await (prisma as any).$executeRawUnsafe(`
          INSERT INTO customer (id, code, name, abbreviation, classification, country, phone, email, address, representative, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, id, code, name, abbreviation, classification, country, phone, email, address, representative, status);
      }
    }
  }

  revalidatePath("/danh-muc/khach-hang");
}
