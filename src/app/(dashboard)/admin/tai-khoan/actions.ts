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

    // 2. Kiểm tra và tạo quyền Admin mặc định
    let adminPermission = await prisma.permission.findUnique({ where: { code: "ADMIN_FULL" } });
    if (!adminPermission) {
      adminPermission = await prisma.permission.create({
        data: {
          id: crypto.randomUUID(),
          code: "ADMIN_FULL",
          name: "Quản trị hệ thống (Toàn quyền)",
          permissiondetail: {
            create: [
              { moduleKey: "NS_EMPLOYEE", canAccess: true },
              { moduleKey: "NS_CONTRACT", canAccess: true },
              { moduleKey: "NS_LEAVE", canAccess: true },
              { moduleKey: "NS_ATTENDANCE", canAccess: true },
              { moduleKey: "NS_PAYROLL", canAccess: true },
              { moduleKey: "NS_SALARY_CHANGE", canAccess: true },
              { moduleKey: "NS_DIEU_DONG", canAccess: true },
              { moduleKey: "NS_BAC_LUONG", canAccess: true },
              { moduleKey: "NS_APPROVE", canAccess: true },
              { moduleKey: "NS_NGHI_VIEC", canAccess: true },
              { moduleKey: "LUONG_BHXH", canAccess: true },
              { moduleKey: "LB_CHAM_CONG", canAccess: true },
              { moduleKey: "SALES_ORDER", canAccess: true },
              { moduleKey: "PROD_MATERIAL_PLAN", canAccess: true },
            ]
          }
        }
      });
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
