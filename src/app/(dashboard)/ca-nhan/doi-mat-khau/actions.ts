"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function changePassword(password: string, confirmPassword: string) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { error: "Bạn chưa đăng nhập. Vui lòng đăng nhập lại." };
    }

    if (!password) {
      return { error: "Vui lòng nhập mật khẩu mới." };
    }

    if (password.length < 3) {
      return { error: "Mật khẩu phải có ít nhất 3 ký tự." };
    }

    if (password !== confirmPassword) {
      return { error: "Mật khẩu nhập lại không khớp." };
    }

    // Cập nhật mật khẩu trong DB
    await prisma.user.update({
      where: { id: session.userId },
      data: { password: password }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Change password error:", error);
    return { error: "Có lỗi xảy ra khi đổi mật khẩu: " + error.message };
  }
}
