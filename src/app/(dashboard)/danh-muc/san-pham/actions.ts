"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

async function createAuditLog(tableName: string, recordId: string, action: string, oldData: any, newData: any, changeDetail: string) {
  const session = await getSession();
  const username = session?.username || "Unknown";
  await (prisma as any).auditlog.create({
    data: {
      tableName,
      recordId,
      action,
      oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
      newData: newData ? JSON.parse(JSON.stringify(newData)) : null,
      changedBy: username,
      changeDetail,
    },
  });
}

export async function getProducts() {
  return await prisma.product.findMany({
    include: {
      productcategory: true,
      unit: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCategories() {
  return await (prisma as any).productcategory.findMany({
    where: { status: "Hoạt động" },
  });
}

export async function getUnits() {
  return await prisma.unit.findMany({
    where: { status: "Hoạt động" },
  });
}

export async function createProduct(formData: FormData) {
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const categoryId = formData.get("categoryId") as string;
  const status = formData.get("status") as string;
  const note = formData.get("note") as string;
  const unitIds = formData.getAll("unitIds") as string[];

  const product = await prisma.product.create({
    data: {
      code,
      name,
      categoryId,
      status,
      note,
      unit: {
        connect: unitIds.map(id => ({ id }))
      }
    },
    include: { unit: true }
  });

  await createAuditLog("Product", product.id, "CREATE", null, product, `Thêm mới sản phẩm: ${name}`);
  revalidatePath("/danh-muc/san-pham");
  return product;
}

export async function updateProduct(id: string, formData: FormData) {
  const oldProduct = await prisma.product.findUnique({ 
    where: { id },
    include: { unit: true }
  });
  
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const categoryId = formData.get("categoryId") as string;
  const status = formData.get("status") as string;
  const note = formData.get("note") as string;
  const unitIds = formData.getAll("unitIds") as string[];

  const product = await prisma.product.update({
    where: { id },
    data: {
      code,
      name,
      categoryId,
      status,
      note,
      unit: {
        set: [], // Clear existing relations
        connect: unitIds.map(id => ({ id }))
      }
    },
    include: { unit: true }
  });

  await createAuditLog("Product", id, "UPDATE", oldProduct, product, `Cập nhật sản phẩm: ${name}`);
  revalidatePath("/danh-muc/san-pham");
  return product;
}

export async function updateProductStatus(id: string, status: string) {
  const oldProduct = await prisma.product.findUnique({ where: { id } });
  const product = await prisma.product.update({
    where: { id },
    data: { status },
  });

  await createAuditLog("Product", id, "STATUS_CHANGE", oldProduct, product, `Thay đổi trạng thái sản phẩm: ${status}`);
  revalidatePath("/danh-muc/san-pham");
  return product;
}

export async function deleteProduct(id: string) {
  const oldProduct = await prisma.product.findUnique({ where: { id } });
  await prisma.product.delete({ where: { id } });

  await createAuditLog("Product", id, "DELETE", oldProduct, null, `Xóa sản phẩm: ${oldProduct?.name}`);
  revalidatePath("/danh-muc/san-pham");
}
