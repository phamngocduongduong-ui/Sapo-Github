"use server"

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { encrypt } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ensureDefaultAdmin } from "../(dashboard)/admin/tai-khoan/actions";

export async function login(prevState: any, formData: FormData) {
  try {
    await ensureDefaultAdmin();
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    if (!username || !password) {
      return { error: "Vui lòng nhập đầy đủ thông tin" };
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || user.password !== password) {
      return { error: "Tên đăng nhập hoặc mật khẩu không chính xác" };
    }

    if (user.status === "INACTIVE") {
      return { error: "Tài khoản của bạn đã bị ngưng hoạt động. Vui lòng liên hệ quản trị viên." };
    }
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await encrypt({ 
      userId: user.id, 
      username: user.username,
      employeeName: user.employeeName || user.username,
      expires 
    });

    cookies().set("session", session, { expires, httpOnly: true });

    redirect("/");
  } catch (error) {
    if ((error as any).digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Login database error:", error);
    return { error: "Không thể kết nối đến cơ sở dữ liệu. Vui lòng kiểm tra lại server MySQL." };
  }
}


export async function logout() {
      cookies().delete("session");
      redirect("/login");
}
