"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { encrypt } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function login(prevState: any, formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Vui lòng nhập đầy đủ thông tin" };
  }

  // Tìm user trong database
  const user = await prisma.user.findUnique({
    where: { username }
  });

  // Kiểm tra user tồn tại và mật khẩu khớp
  if (!user || user.password !== password) {
    return { error: "Tên đăng nhập hoặc mật khẩu sai" };
  }

  // Kiểm tra trạng thái tài khoản
  if (user.status === "INACTIVE") {
    return { error: "Tài khoản của bạn đã bị ngừng sử dụng" };
  }

  // Tạo session
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 ngày
  const session = await encrypt({ 
    userId: user.id, 
    username: user.username,
    employeeName: user.employeeName, // Lưu tên nhân viên thực tế
    role: user.role,
    expires 
  });

  cookies().set("session", session, { expires, httpOnly: true });
  
  // Chuyển hướng về trang chủ sau khi đăng nhập thành công
  redirect("/");
}

export async function logout() {
  cookies().set("session", "", { expires: new Date(0) });
  redirect("/login");
}

