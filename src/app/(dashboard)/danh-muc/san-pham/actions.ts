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
  let code = formData.get("code") as string;
  const categoryId = formData.get("categoryId") as string;
  if (!code || code.trim() === "") {
    const category = await prisma.productcategory.findUnique({
      where: { id: categoryId }
    });
    const categoryName = category?.name || "";
    let prefix = "KC";
    const normalized = categoryName.trim().toLowerCase();
    if (normalized === "thành phẩm sản xuất") {
      prefix = "SP";
    } else if (normalized === "vật tư, bao bì đóng gói" || normalized === "vật tư bao bì đóng gói") {
      prefix = "VT";
    } else if (normalized === "hóa chất") {
      prefix = "HC";
    } else if (normalized === "công cụ dụng cụ sản xuất" || normalized === "công cụ, dụng cụ sản xuất") {
      prefix = "CC";
    }

    const count = await prisma.product.count({
      where: { categoryId }
    });
    code = `${prefix}${String(count + 1).padStart(4, '0')}`;
  }
  const name = formData.get("name") as string;
  const englishName = formData.get("englishName") as string;
  const packaging = formData.get("packaging") as string;
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

export async function importProducts(data: any[], mode: "append" | "replace") {
  if (mode === "replace") {
    await prisma.product.deleteMany({});
  }

  const [categories, warehouses, units] = await Promise.all([
    prisma.productcategory.findMany({ where: { status: "Hoạt động" } }),
    prisma.warehouse.findMany({ where: { status: "Hoạt động" } }),
    prisma.unit.findMany({ where: { status: "Hoạt động" } })
  ]);

  const categoryCounts: { [categoryId: string]: number } = {};
  for (const cat of categories) {
    const count = await prisma.product.count({ where: { categoryId: cat.id } });
    categoryCounts[cat.id] = count;
  }

  for (const item of data) {
    const name = (item.name || "").toString().trim();
    if (!name) continue;

    const categoryName = (item.categoryName || "").toString().trim();
    const category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    if (!category) {
      throw new Error(`Không tìm thấy Nhóm sản phẩm "${categoryName}" hoạt động trong hệ thống!`);
    }

    const warehouseName = (item.warehouseName || "").toString().trim();
    const warehouse = warehouses.find(w => w.name.toLowerCase() === warehouseName.toLowerCase());
    if (!warehouse) {
      throw new Error(`Không tìm thấy Kho mặc định "${warehouseName}" hoạt động trong hệ thống!`);
    }

    const unitNamesStr = (item.unitNames || "").toString().trim();
    if (!unitNamesStr) {
      throw new Error(`Vui lòng cung cấp Đơn vị tính cho sản phẩm "${name}"!`);
    }

    const splitNames = unitNamesStr.split(/[,;]/).map((n: string) => n.trim().toLowerCase());
    const matchedUnits = units.filter(u => splitNames.includes(u.name.toLowerCase()));
    if (matchedUnits.length === 0) {
      throw new Error(`Không tìm thấy Đơn vị tính nào hoạt động khớp với "${unitNamesStr}" trong hệ thống!`);
    }

    const englishName = item.englishName ? item.englishName.toString().trim() : null;
    const packaging = item.packaging ? item.packaging.toString().trim() : null;
    const note = item.note ? item.note.toString().trim() : null;

    let existingProduct = null;
    if (mode === "append") {
      existingProduct = await prisma.product.findFirst({
        where: { name }
      });
    }

    if (existingProduct) {
      const updatedProduct = await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          englishName,
          packaging,
          categoryId: category.id,
          warehouseId: warehouse.id,
          note,
          status: "Hoạt động",
          unit: {
            set: [],
            connect: matchedUnits.map(u => ({ id: u.id }))
          }
        },
        include: { unit: true, warehouse: true }
      });
      await createAuditLog("Product", updatedProduct.id, "UPDATE", existingProduct, updatedProduct, `Import Excel - Cập nhật sản phẩm: ${name}`);
    } else {
      let prefix = "KC";
      const normalizedCat = category.name.trim().toLowerCase();
      if (normalizedCat === "thành phẩm sản xuất") {
        prefix = "SP";
      } else if (normalizedCat === "vật tư, bao bì đóng gói" || normalizedCat === "vật tư bao bì đóng gói") {
        prefix = "VT";
      } else if (normalizedCat === "hóa chất") {
        prefix = "HC";
      } else if (normalizedCat === "công cụ dụng cụ sản xuất" || normalizedCat === "công cụ, dụng cụ sản xuất") {
        prefix = "CC";
      }

      const currentCount = categoryCounts[category.id] || 0;
      const nextCount = currentCount + 1;
      categoryCounts[category.id] = nextCount;
      const code = `${prefix}${String(nextCount).padStart(4, '0')}`;

      const newProduct = await prisma.product.create({
        data: {
          code,
          name,
          englishName,
          packaging,
          categoryId: category.id,
          warehouseId: warehouse.id,
          note,
          status: "Hoạt động",
          unit: {
            connect: matchedUnits.map(u => ({ id: u.id }))
          }
        },
        include: { unit: true, warehouse: true }
      });
      await createAuditLog("Product", newProduct.id, "CREATE", null, newProduct, `Import Excel - Thêm mới sản phẩm: ${name}`);
    }
  }

  revalidatePath("/danh-muc/san-pham");
}

