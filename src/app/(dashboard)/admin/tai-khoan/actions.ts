"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Khởi tạo tài khoản admin và dữ liệu mặc định
export async function ensureDefaultAdmin() {
  try {
    // 1. Kiểm tra và tạo chi nhánh mặc định nếu chưa có
    const branchCount = await prisma.branch.count();
    if (branchCount === 0) {
      await prisma.branch.create({
        data: { code: "HCM", name: "Hồ Chí Minh" }
      });
    }

    // 2. Kiểm tra và tạo/cập nhật quyền Admin mặc định
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

    let adminPermission = await prisma.permission.findUnique({ where: { code: "ADMIN_FULL" } });
    if (!adminPermission) {
      adminPermission = await prisma.permission.create({
        data: {
          id: crypto.randomUUID(),
          code: "ADMIN_FULL",
          name: "Quản trị hệ thống (Toàn quyền)",
        }
      });
    }

    // Dọn dẹp các moduleKey cũ/lỗi thời không còn tồn tại trong hệ thống
    await (prisma as any).permissiondetail.deleteMany({
      where: {
        moduleKey: {
          notIn: ALL_MODULE_KEYS
        }
      }
    });

    // Đồng bộ chi tiết quyền cho ADMIN_FULL (đảm bảo luôn có đủ tất cả các moduleKey mới với canAccess = true)
    const existingAdminDetails = await (prisma as any).permissiondetail.findMany({
      where: { permissionId: adminPermission.id }
    });
    const existingAdminKeys = new Set(existingAdminDetails.map((d: any) => d.moduleKey));
    const adminKeysToInsert = ALL_MODULE_KEYS.filter(key => !existingAdminKeys.has(key));
    
    if (adminKeysToInsert.length > 0) {
      await (prisma as any).permissiondetail.createMany({
        data: adminKeysToInsert.map(key => ({
          permissionId: adminPermission.id,
          moduleKey: key,
          canAccess: true
        }))
      });
    }

    // Đồng bộ các moduleKey mới (canAccess = false) cho tất cả các Mục quyền khác
    const allPermissions = await prisma.permission.findMany();
    for (const perm of allPermissions) {
      if (perm.id === adminPermission.id) continue;
      const existingDetails = await (prisma as any).permissiondetail.findMany({
        where: { permissionId: perm.id }
      });
      const existingKeys = new Set(existingDetails.map((d: any) => d.moduleKey));
      const keysToInsert = ALL_MODULE_KEYS.filter(key => !existingKeys.has(key));
      if (keysToInsert.length > 0) {
        await (prisma as any).permissiondetail.createMany({
          data: keysToInsert.map(key => ({
            permissionId: perm.id,
            moduleKey: key,
            canAccess: false
          }))
        });
      }
    }

    // 3. Kiểm tra và tạo tài khoản admin
    const admin = await prisma.user.findUnique({
      where: { username: "admin" }
    });
  
    if (!admin) {
      const allBranches = await prisma.branch.findMany({ select: { name: true } });
      const branchNames = allBranches.map(b => b.name).join(",");
  
      await prisma.user.create({
        data: {
          username: "admin",
          password: "Admin123",
          employeeName: "Quản trị viên",
          branch: branchNames,
          role: "Admin",
          status: "ACTIVE",
          permission: {
            connect: { id: adminPermission.id }
          }
        }
      });
    }
  } catch (e) {
    console.log("Dữ liệu mặc định đã tồn tại hoặc lỗi khởi tạo:", e);
  }
}

export async function createUser(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const employeeName = formData.get("employeeName") as string;
  const branch = formData.get("branch") as string; // Chuỗi chi nhánh cách nhau bằng dấu phẩy
  const role = formData.get("role") as string;
  const permissionIds = formData.get("permissionIds") as string; // Comma separated IDs

  if (!username || !password) throw new Error("Vui lòng điền đầy đủ thông tin.");

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new Error("Tên đăng nhập đã tồn tại.");

  await prisma.user.create({
    data: {
      username,
      password,
      employeeName: employeeName || null,
      branch: branch || null,
      role: role || "USER",
      permission: {
        connect: permissionIds ? permissionIds.split(",").map(id => ({ id })) : []
      },
      status: "ACTIVE"
    },
  });

  revalidatePath("/admin/tai-khoan");
}

export async function updateUser(id: string, formData: FormData) {
  const branch = formData.get("branch") as string;
  const permissionIds = formData.get("permissionIds") as string;

  const user = await prisma.user.findUnique({ where: { id } });
  if (user?.username === "admin") throw new Error("Không thể sửa tài khoản admin hệ thống.");
  if (user?.status === "INACTIVE") throw new Error("Không thể sửa tài khoản đang bị ngưng hoạt động.");

  await prisma.user.update({
    where: { id },
    data: {
      branch: branch || null,
      permission: {
        set: permissionIds ? permissionIds.split(",").map(id => ({ id })) : []
      },
    }
  });

  revalidatePath("/admin/tai-khoan");
}

export async function updateUserStatus(id: string, status: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (user?.username === "admin") throw new Error("Không thể thay đổi trạng thái tài khoản admin hệ thống.");

  await prisma.user.update({
    where: { id },
    data: { status }
  });

  revalidatePath("/admin/tai-khoan");
}

export async function resetPassword(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (user?.username === "admin") throw new Error("Không thể đổi mật khẩu tài khoản admin hệ thống.");
  if (user?.status === "INACTIVE") throw new Error("Không thể cấp lại mật khẩu cho tài khoản đang bị ngưng hoạt động.");

  await prisma.user.update({
    where: { id },
    data: { password: "123" }
  });

  revalidatePath("/admin/tai-khoan");
}

export async function deleteUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (user?.username === "admin") throw new Error("Không thể xóa tài khoản admin hệ thống.");
  
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/tai-khoan");
}

export async function approveDeviceChange(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Tài khoản không tồn tại");
  if (!user.pendingDeviceSecret) throw new Error("Không có yêu cầu đổi thiết bị nào");

  await prisma.user.update({
    where: { id: userId },
    data: {
      deviceSecret: user.pendingDeviceSecret,
      pendingDeviceSecret: null,
      deviceStatus: "APPROVED"
    }
  });

  revalidatePath("/admin/tai-khoan");
}

export async function rejectDeviceChange(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Tài khoản không tồn tại");

  await prisma.user.update({
    where: { id: userId },
    data: {
      pendingDeviceSecret: null,
      deviceStatus: "APPROVED"
    }
  });

  revalidatePath("/admin/tai-khoan");
}

export async function resetUserDevice(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Tài khoản không tồn tại");

  await prisma.user.update({
    where: { id: userId },
    data: {
      deviceSecret: null,
      pendingDeviceSecret: null,
      deviceStatus: "APPROVED"
    }
  });

  revalidatePath("/admin/tai-khoan");
}

