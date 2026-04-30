"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Khởi tạo tài khoản admin và dữ liệu mặc định
export async function ensureDefaultAdmin() {
  try {
    // 1. Kiểm tra và tạo chi nhánh mặc định nếu chưa có
    const branchCount = await prisma.branch.count();
    if (branchCount === 0) {
      await prisma.branch.createMany({
        data: [
          { code: "CN001", name: "Tổng công ty" },
          { code: "CN002", name: "Chi nhánh Hà Nội" },
          { code: "CN003", name: "Chi nhánh TP.HCM" }
        ]
      });
    }

    // 2. Kiểm tra và tạo quyền Admin mặc định
    let adminPermission = await prisma.permission.findUnique({ where: { code: "ADMIN_FULL" } });
    if (!adminPermission) {
      adminPermission = await prisma.permission.create({
        data: {
          code: "ADMIN_FULL",
          name: "Quản trị hệ thống (Toàn quyền)",
          details: {
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
          permissionId: adminPermission.id
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
  const permissionId = formData.get("permissionId") as string;

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
      permissionId: permissionId || null,
      status: "ACTIVE"
    },
  });

  revalidatePath("/admin/tai-khoan");
}

export async function updateUser(id: string, formData: FormData) {
  const username = formData.get("username") as string;
  const employeeName = formData.get("employeeName") as string;
  const branch = formData.get("branch") as string;
  const role = formData.get("role") as string;
  const permissionId = formData.get("permissionId") as string;
  const status = formData.get("status") as string;

  const user = await prisma.user.findUnique({ where: { id } });
  if (user?.username === "admin") throw new Error("Không thể sửa tài khoản admin hệ thống.");

  await prisma.user.update({
    where: { id },
    data: {
      employeeName: employeeName || null,
      branch: branch || null,
      role: role || undefined,
      permissionId: permissionId || null,
      status
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

export async function resetPassword(id: string, formData: FormData) {
  const password = formData.get("password") as string;
  if (!password) throw new Error("Mật khẩu không được để trống.");

  const user = await prisma.user.findUnique({ where: { id } });
  if (user?.username === "admin") throw new Error("Không thể đổi mật khẩu tài khoản admin hệ thống theo cách này.");

  await prisma.user.update({
    where: { id },
    data: { password }
  });

  revalidatePath("/admin/tai-khoan");
}
