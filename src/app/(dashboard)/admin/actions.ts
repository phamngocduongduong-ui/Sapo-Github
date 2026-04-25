"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Khởi tạo tài khoản admin mặc định
export async function ensureDefaultAdmin() {
  const admin = await prisma.user.findUnique({
    where: { username: "admin" }
  });

  if (!admin) {
    // Lấy tất cả chi nhánh để gán cho admin
    const allBranches = await prisma.branch.findMany({ select: { name: true } });
    const branchNames = allBranches.map(b => b.name).join(",");

    await prisma.user.create({
      data: {
        username: "admin",
        password: "Admin123",
        employeeName: "Admin",
        branch: branchNames,
        role: "Admin",
        status: "ACTIVE"
      }
    });
  }
}

export async function createUser(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const employeeName = formData.get("employeeName") as string;
  const branch = formData.get("branch") as string; // Chuỗi chi nhánh cách nhau bằng dấu phẩy
  const role = formData.get("role") as string;

  if (!username || !password || !role) throw new Error("Vui lòng điền đầy đủ thông tin.");

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new Error("Tên đăng nhập đã tồn tại.");

  await prisma.user.create({
    data: {
      username,
      password,
      employeeName: employeeName || null,
      branch: branch || null,
      role,
      status: "ACTIVE"
    },
  });

  revalidatePath("/admin");
}

export async function updateUser(id: string, formData: FormData) {
  const username = formData.get("username") as string;
  const employeeName = formData.get("employeeName") as string;
  const branch = formData.get("branch") as string;
  const role = formData.get("role") as string;
  const status = formData.get("status") as string;

  const user = await prisma.user.findUnique({ where: { id } });
  if (user?.username === "admin") throw new Error("Không thể sửa tài khoản admin hệ thống.");

  await prisma.user.update({
    where: { id },
    data: {
      employeeName: employeeName || null,
      branch: branch || null,
      role,
      status
    }
  });

  revalidatePath("/admin");
}

export async function updateUserStatus(id: string, status: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (user?.username === "admin") throw new Error("Không thể thay đổi trạng thái tài khoản admin hệ thống.");

  await prisma.user.update({
    where: { id },
    data: { status }
  });

  revalidatePath("/admin");
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

  revalidatePath("/admin");
}
