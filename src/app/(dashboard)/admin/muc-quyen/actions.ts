"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getPermissions() {
  return await prisma.permission.findMany({
    orderBy: { createdAt: "desc" }
  });
}

export async function getPermissionDetails(permissionId: string) {
  return await (prisma as any).permissiondetail.findMany({
    where: { permissionId }
  });
}

export async function createPermission(formData: FormData) {
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const status = formData.get("status") as string || "ACTIVE";
  const detailKeysStr = formData.get("detailKeys") as string || "";

  if (!code || !name) throw new Error("Mã và tên quyền là bắt buộc.");

  const id = crypto.randomUUID();
  const detailKeys = detailKeysStr.split(",").filter(Boolean);

  const ALL_MODULE_KEYS = [
    "CA_NHAN", "CN_HO_SO", "CN_CHAM_CONG", "CN_NGHI_PHEP", "CN_NGHI_VIEC", "CN_TRA_CUU_LUONG",
    "DANH_MUC", "DM_BO_PHAN", "DM_CHI_NHANH", "DM_CHUC_VU", "DM_KHACH_HANG", "DM_NHA_CUNG_CAP", "DM_NHOM_SP", "DM_QUOC_GIA", "DM_SAN_PHAM", "DM_DON_VI_TINH", "DM_KHO_HANG", "DM_VI_TRI",
    "NHAN_SU", "NS_NHAN_VIEN", "NS_HOP_DONG", "NS_DIEU_DONG", "NS_APPROVE", "NS_BAO_CAO",
    "LUONG_BHXH", "LB_CHAM_CONG", "LB_KHU_VUC", "NS_BANG_LUONG", "NS_TANG_GIAM_LUONG", "NS_BAC_LUONG",
    "KINH_DOANH", "KD_HOP_DONG", "KD_DON_HANG",
    "THU_MUA", "TM_LENH_MUA", "TM_APPROVE", "TM_DON_MUA", "TM_DIEU_DONG", "TM_BAO_CAO",
    "SAN_XUAT", "SX_DON_SAN_XUAT", "SX_KE_HOACH_GIAO", "SX_VAT_TU",
    "BAO_TRI", "BT_DE_NGHI_MUA", "BT_PHE_DUYET",
    "THU_KHO", "TK_KHO_VAT_TU", "TK_KHO_THANH_PHAM",
    "QUAN_TRI", "QT_TAI_KHOAN", "QT_MUC_QUYEN", "QT_PHAN_QUYEN",
    "AN_NINH", "AN_DANG_KY", "AN_DANH_SACH", "AN_KIEM_TRA"
  ];

  await prisma.$transaction([
    prisma.permission.create({
      data: {
        id,
        code,
        name,
        status
      }
    }),
    (prisma as any).permissiondetail.createMany({
      data: ALL_MODULE_KEYS.map(key => ({
        permissionId: id,
        moduleKey: key,
        canAccess: detailKeys.includes(key)
      }))
    })
  ]);

  revalidatePath("/admin/muc-quyen");
  revalidatePath("/admin/quyen-su-dung");
  revalidatePath("/admin/tai-khoan");
}

export async function updatePermission(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const status = formData.get("status") as string;

  if (!name) throw new Error("Tên quyền là bắt buộc.");

  await prisma.permission.update({
    where: { id },
    data: { name, status }
  });

  revalidatePath("/admin/muc-quyen");
  revalidatePath("/admin/quyen-su-dung");
  revalidatePath("/admin/tai-khoan");
}

export async function updatePermissionStatus(id: string, status: string) {
  const perm = await prisma.permission.findUnique({
    where: { id }
  });
  if (perm && perm.code.toUpperCase() === "ADMIN" && status === "INACTIVE") {
    throw new Error("Không thể ngưng hoạt động mục quyền ADMIN.");
  }

  await prisma.permission.update({
    where: { id },
    data: { status }
  });
  revalidatePath("/admin/muc-quyen");
  revalidatePath("/admin/quyen-su-dung");
  revalidatePath("/admin/tai-khoan");
}

export async function deletePermission(id: string) {
  const perm = await prisma.permission.findUnique({
    where: { id },
    include: { user: true }
  });
  if (perm && perm.code.toUpperCase() === "ADMIN") {
    throw new Error("Không thể xóa mục quyền ADMIN.");
  }
  if (perm && perm.user.length > 0) {
    throw new Error("Không thể xóa mục quyền đang được gán cho tài khoản người dùng.");
  }
  await prisma.permission.delete({
    where: { id }
  });
  revalidatePath("/admin/muc-quyen");
  revalidatePath("/admin/quyen-su-dung");
  revalidatePath("/admin/tai-khoan");
}

