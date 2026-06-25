"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function generateNextSupplierCode() {
  const results = await (prisma as any).$queryRawUnsafe(`
    SELECT code FROM supplier 
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

export async function createSupplier(formData: FormData) {
  const name = (formData.get("name") as string || "").trim().toUpperCase();
  const taxCode = (formData.get("taxCode") as string || "").trim();
  const phone = (formData.get("phone") as string || "").trim();
  const email = (formData.get("email") as string || "").trim();
  const address = (formData.get("address") as string || "").trim().toUpperCase();
  const debtPolicy = (formData.get("debtPolicy") as string || "").trim();
  const debtDays = parseInt(formData.get("debtDays") as string || "0", 10) || 0;
  const bankAccountInfo = (formData.get("bankAccountInfo") as string || "").trim();

  if (!name) {
    throw new Error("Tên nhà cung cấp là bắt buộc.");
  }

  const code = await generateNextSupplierCode();

  // Check unique code
  const existing = await (prisma as any).supplier.findFirst({
    where: { code }
  });
  if (existing) {
    throw new Error("Mã nhà cung cấp này đã tồn tại trong hệ thống.");
  }

  const id = require('crypto').randomUUID();

  await (prisma as any).supplier.create({
    data: {
      id,
      code,
      name,
      taxCode: taxCode || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      debtPolicy: debtPolicy || null,
      debtDays,
      status: "Hoạt động",
      bankAccountInfo: bankAccountInfo || null
    }
  });

  revalidatePath("/danh-muc/nha-cung-cap");
  revalidatePath("/purchasing/lenh-mua");
}

export async function updateSupplier(id: string, formData: FormData) {
  const name = (formData.get("name") as string || "").trim().toUpperCase();
  const taxCode = (formData.get("taxCode") as string || "").trim();
  const phone = (formData.get("phone") as string || "").trim();
  const email = (formData.get("email") as string || "").trim();
  const address = (formData.get("address") as string || "").trim().toUpperCase();
  const debtPolicy = (formData.get("debtPolicy") as string || "").trim();
  const debtDays = parseInt(formData.get("debtDays") as string || "0", 10) || 0;
  const bankAccountInfo = (formData.get("bankAccountInfo") as string || "").trim();

  if (!name) {
    throw new Error("Tên nhà cung cấp là bắt buộc.");
  }

  await (prisma as any).supplier.update({
    where: { id },
    data: {
      name,
      taxCode: taxCode || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      debtPolicy: debtPolicy || null,
      debtDays,
      bankAccountInfo: bankAccountInfo || null
    }
  });

  revalidatePath("/danh-muc/nha-cung-cap");
  revalidatePath("/purchasing/lenh-mua");
}

export async function toggleSupplierStatus(id: string, currentStatus: string) {
  const newStatus = currentStatus === "Hoạt động" ? "Ngưng hoạt động" : "Hoạt động";
  
  await (prisma as any).supplier.update({
    where: { id },
    data: { status: newStatus }
  });

  revalidatePath("/danh-muc/nha-cung-cap");
  revalidatePath("/purchasing/lenh-mua");
}

export async function deleteSupplier(id: string) {
  await (prisma as any).supplier.delete({
    where: { id }
  });

  revalidatePath("/danh-muc/nha-cung-cap");
  revalidatePath("/purchasing/lenh-mua");
}

export async function checkSupplierHasPOs(code: string): Promise<boolean> {
  // Check if there are any POs for this supplier
  const poCount = await (prisma as any).purchaseorder.count({
    where: {
      supplier: {
        contains: code // PO supplier field matches or contains code/name
      }
    }
  });
  return poCount > 0;
}

export async function bulkReplaceSuppliers(data: any[]) {
  // Delete all existing suppliers
  await (prisma as any).supplier.deleteMany({});

  // Insert new suppliers
  for (const item of data) {
    const id = require('crypto').randomUUID();
    const code = (item.code || "").trim().toUpperCase();
    const name = (item.name || "").trim().toUpperCase();
    const taxCode = (item.taxCode || "").trim();
    const phone = (item.phone || "").trim();
    const email = (item.email || "").trim();
    const address = (item.address || "").trim().toUpperCase();
    const debtPolicy = (item.debtPolicy || "").trim();
    const debtDays = parseInt(item.debtDays || "0", 10) || 0;
    const status = item.status || "Hoạt động";
    const bankAccountInfo = (item.bankAccountInfo || "").trim();

    await (prisma as any).supplier.create({
      data: {
        id,
        code,
        name,
        taxCode: taxCode || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        debtPolicy: debtPolicy || null,
        debtDays,
        status,
        bankAccountInfo: bankAccountInfo || null
      }
    });
  }

  revalidatePath("/danh-muc/nha-cung-cap");
  revalidatePath("/purchasing/lenh-mua");
}

export async function importSuppliers(data: any[], mode: "append" | "replace") {
  function resolveStatus(inputStatus: string): string {
    if (!inputStatus) return "Hoạt động";
    const normalized = inputStatus.toString().trim().toLowerCase();
    if (normalized === "ngưng hoạt động" || normalized === "ngung hoat dong" || normalized === "inactive" || normalized === "n" || normalized === "no" || normalized === "ngừng sử dụng" || normalized === "ngung su dung") {
      return "Ngưng hoạt động";
    }
    return "Hoạt động";
  }

  if (mode === "replace") {
    // 1. Delete all existing suppliers
    await (prisma as any).supplier.deleteMany({});

    let count = 0;
    // 2. Insert all suppliers with code starting from 0001.HCM
    for (const item of data) {
      count++;
      const id = require('crypto').randomUUID();
      const code = `${count.toString().padStart(4, '0')}.HCM`;
      const name = (item.name || "").toString().trim().toUpperCase();
      const taxCode = (item.taxCode || "").toString().trim();
      const phone = (item.phone || "").toString().trim();
      const email = (item.email || "").toString().trim();
      const address = (item.address || "").toString().trim().toUpperCase();
      const debtPolicy = (item.debtPolicy || "").toString().trim();
      const debtDays = parseInt(item.debtDays || "0", 10) || 0;
      const status = resolveStatus(item.status);
      const bankAccountInfo = (item.bankAccountInfo || "").toString().trim();

      await (prisma as any).supplier.create({
        data: {
          id,
          code,
          name,
          taxCode: taxCode || null,
          phone: phone || null,
          email: email || null,
          address: address || null,
          debtPolicy: debtPolicy || null,
          debtDays,
          status,
          bankAccountInfo: bankAccountInfo || null
        }
      });
    }
  } else {
    // mode === "append"
    // Fetch all existing suppliers to match
    const existingSuppliers = await (prisma as any).supplier.findMany({});

    // Track maxNumber for code generation
    let maxNumber = 0;
    for (const es of existingSuppliers) {
      const match = es.code.match(/^(\d{4})\.HCM$/i);
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
      if (!name) continue;

      const inputCode = (item.code || "").toString().trim().toUpperCase();

      let matchedES = existingSuppliers.find((es: any) => 
        (inputCode && es.code.toUpperCase() === inputCode) || 
        es.name.toUpperCase() === name
      );

      const taxCode = (item.taxCode || "").toString().trim();
      const phone = (item.phone || "").toString().trim();
      const email = (item.email || "").toString().trim();
      const address = (item.address || "").toString().trim().toUpperCase();
      const debtPolicy = (item.debtPolicy || "").toString().trim();
      const debtDays = parseInt(item.debtDays || "0", 10) || 0;
      const status = resolveStatus(item.status);
      const bankAccountInfo = (item.bankAccountInfo || "").toString().trim();

      if (matchedES) {
        // Update existing
        await (prisma as any).supplier.update({
          where: { id: matchedES.id },
          data: {
            name,
            taxCode: taxCode || null,
            phone: phone || null,
            email: email || null,
            address: address || null,
            debtPolicy: debtPolicy || null,
            debtDays,
            status,
            bankAccountInfo: bankAccountInfo || null
          }
        });
      } else {
        // Insert new
        newCodeOffset++;
        const nextNumber = maxNumber + newCodeOffset;
        const code = `${nextNumber.toString().padStart(4, '0')}.HCM`;
        const id = require('crypto').randomUUID();

        await (prisma as any).supplier.create({
          data: {
            id,
            code,
            name,
            taxCode: taxCode || null,
            phone: phone || null,
            email: email || null,
            address: address || null,
            debtPolicy: debtPolicy || null,
            debtDays,
            status,
            bankAccountInfo: bankAccountInfo || null
          }
        });
      }
    }
  }

  revalidatePath("/danh-muc/nha-cung-cap");
  revalidatePath("/purchasing/lenh-mua");
}
