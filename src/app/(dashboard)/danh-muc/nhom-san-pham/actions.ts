"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getProductCategories() {
  return await (prisma as any).productcategory.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createProductCategory(formData: FormData) {
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const status = formData.get("status") as string || "Hoạt động";

  if (!code || !name) throw new Error("Mã và tên nhóm là bắt buộc.");

  await (prisma as any).productcategory.create({
    data: {
      code,
      name,
      description,
      status
    }
  });

  revalidatePath("/danh-muc/nhom-san-pham");
}

export async function updateProductCategory(id: string, formData: FormData) {
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const status = formData.get("status") as string;

  await (prisma as any).productcategory.update({
    where: { id },
    data: {
      code,
      name,
      description,
      status
    }
  });

  revalidatePath("/danh-muc/nhom-san-pham");
}

export async function updateCategoryStatus(id: string, status: string) {
  await (prisma as any).productcategory.update({
    where: { id },
    data: { status }
  });

  revalidatePath("/danh-muc/nhom-san-pham");
}

export async function deleteProductCategory(id: string) {
  try {
    // Kiểm tra xem có sản phẩm nào đang liên kết với nhóm này hay không
    const productCount = await prisma.product.count({
      where: { categoryId: id }
    });

    if (productCount > 0) {
      throw new Error(`Không thể xóa nhóm sản phẩm này vì đang có ${productCount} sản phẩm thuộc nhóm này.`);
    }

    await (prisma as any).productcategory.delete({
      where: { id }
    });

    revalidatePath("/danh-muc/nhom-san-pham");
  } catch (error: any) {
    console.error("Lỗi khi xóa nhóm sản phẩm:", error);
    if (error.code === "P2003") {
      throw new Error("Không thể xóa nhóm sản phẩm này vì dữ liệu đang được sử dụng ở các bảng khác liên quan.");
    }
    throw new Error(error.message || "Đã xảy ra lỗi khi xóa nhóm sản phẩm.");
  }
}
