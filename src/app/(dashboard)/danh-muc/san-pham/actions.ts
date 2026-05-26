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
      warehouse: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getWarehouses() {
  return await prisma.warehouse.findMany({
    where: { status: "Hoạt động" },
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
  const englishName = formData.get("englishName") as string;
  const packaging = formData.get("packaging") as string;
  const categoryId = formData.get("categoryId") as string;
  const note = formData.get("note") as string;
  const unitIds = formData.getAll("unitIds") as string[];
  const warehouseId = formData.get("warehouseId") as string;

  const product = await prisma.product.create({
    data: {
      code,
      name,
      englishName: englishName || null,
      packaging: packaging || null,
      categoryId,
      warehouseId: warehouseId || null,
      status: "Hoạt động",
      note,
      unit: {
        connect: unitIds.map(id => ({ id }))
      }
    },
    include: { unit: true, warehouse: true }
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
  const englishName = formData.get("englishName") as string;
  const packaging = formData.get("packaging") as string;
  const categoryId = formData.get("categoryId") as string;
  const status = formData.get("status") as string;
  const note = formData.get("note") as string;
  const unitIds = formData.getAll("unitIds") as string[];
  const warehouseId = formData.get("warehouseId") as string;

  const product = await prisma.product.update({
    where: { id },
    data: {
      code,
      name,
      englishName: englishName || null,
      packaging: packaging || null,
      categoryId,
      warehouseId: warehouseId || null,
      status,
      note,
      unit: {
        set: [], // Clear existing relations
        connect: unitIds.map(id => ({ id }))
      }
    },
    include: { unit: true, warehouse: true }
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
  if (!oldProduct) {
    throw new Error("Sản phẩm không tồn tại!");
  }

  // 1. Check if used in Order Items
  const orderItemCount = await prisma.orderitem.count({
    where: { productName: oldProduct.name }
  });
  if (orderItemCount > 0) {
    throw new Error("Không thể xóa sản phẩm này vì đã được sử dụng trong Đơn hàng!");
  }

  // 2. Check if used in Production Plan Items
  const prodPlanItemCount = await (prisma as any).productionplanitem.count({
    where: {
      OR: [
        { product: oldProduct.name },
        { product: oldProduct.code }
      ]
    }
  });
  if (prodPlanItemCount > 0) {
    throw new Error("Không thể xóa sản phẩm này vì đã được sử dụng trong Kế hoạch sản xuất!");
  }

  // 3. Check if used in Purchase Order Details
  const poDetailCount = await prisma.purchaseorderdetail.count({
    where: {
      OR: [
        { productCode: oldProduct.code },
        { productName: oldProduct.name }
      ]
    }
  });
  if (poDetailCount > 0) {
    throw new Error("Không thể xóa sản phẩm này vì đã được sử dụng trong Đơn mua hàng (PO)!");
  }

  // 4. Check if used in Purchase Invoice Details
  const piDetailCount = await prisma.purchaseinvoicedetail.count({
    where: {
      OR: [
        { productCode: oldProduct.code },
        { productName: oldProduct.name }
      ]
    }
  });
  if (piDetailCount > 0) {
    throw new Error("Không thể xóa sản phẩm này vì đã được sử dụng trong Hóa đơn mua hàng!");
  }

  // 5. Check if used in Finished Goods Stock
  const stockCount = await prisma.finishedgoodsstock.count({
    where: { productCode: oldProduct.code }
  });
  if (stockCount > 0) {
    throw new Error("Không thể xóa sản phẩm này vì đã được sử dụng trong Tồn kho thành phẩm!");
  }

  // 6. Check if used in Finished Goods Receipt Details
  const receiptDetailCount = await prisma.finishedgoodsreceiptdetail.count({
    where: { productCode: oldProduct.code }
  });
  if (receiptDetailCount > 0) {
    throw new Error("Không thể xóa sản phẩm này vì đã được sử dụng trong Phiếu nhập kho thành phẩm!");
  }

  // 7. Check if used in Finished Goods Issue Details
  const issueDetailCount = await prisma.finishedgoodsissuedetail.count({
    where: { productCode: oldProduct.code }
  });
  if (issueDetailCount > 0) {
    throw new Error("Không thể xóa sản phẩm này vì đã được sử dụng trong Phiếu xuất kho thành phẩm!");
  }

  // 8. Check if used in Warehouse Log Details
  const logDetailCount = await prisma.warehouselogdetail.count({
    where: { productCode: oldProduct.code }
  });
  if (logDetailCount > 0) {
    throw new Error("Không thể xóa sản phẩm này vì đã được sử dụng trong Nhật ký kho hàng!");
  }

  // 9. Check if used in Contract Items
  const contractItemCount = await prisma.contractitem.count({
    where: { productCode: oldProduct.code }
  });
  if (contractItemCount > 0) {
    throw new Error("Không thể xóa sản phẩm này vì đã được sử dụng trong Hợp đồng mua bán!");
  }

  await prisma.product.delete({ where: { id } });

  await createAuditLog("Product", id, "DELETE", oldProduct, null, `Xóa sản phẩm: ${oldProduct?.name}`);
  revalidatePath("/danh-muc/san-pham");
}
