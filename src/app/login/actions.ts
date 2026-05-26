"use server"

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { encrypt, decrypt } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ensureDefaultAdmin } from "../(dashboard)/admin/tai-khoan/actions";

export async function getActiveBranches() {
  try {
    return await prisma.branch.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" }
    });
  } catch (error) {
    console.error("Error fetching branches:", error);
    return [];
  }
}

export async function changeActiveBranch(branchName: string) {
  try {
    const sessionCookie = cookies().get("session")?.value;
    if (!sessionCookie) {
      return { error: "Không tìm thấy phiên đăng nhập" };
    }

    const payload = await decrypt(sessionCookie);
    if (!payload) {
      return { error: "Phiên đăng nhập không hợp lệ" };
    }

    // Update activeBranch
    payload.activeBranch = branchName;

    // Encrypt again
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    payload.expires = expires;
    const newSession = await encrypt(payload);

    // Save cookie
    cookies().set("session", newSession, { expires, httpOnly: true, path: "/" });

    return { success: true };
  } catch (error) {
    console.error("Error changing active branch:", error);
    return { error: "Có lỗi xảy ra khi đổi chi nhánh" };
  }
}

export async function login(prevState: any, formData: FormData) {
  try {
    await ensureDefaultAdmin();
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const branch = formData.get("branch") as string;

    if (!username || !password) {
      return { error: "Vui lòng nhập đầy đủ thông tin" };
    }

    if (!branch) {
      return { error: "Vui lòng chọn chi nhánh hoạt động" };
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

    if (user.username !== "admin" && user.role !== "Admin") {
      const userBranches = user.branch ? user.branch.split(",").map(b => b.trim()).filter(Boolean) : [];
      if (userBranches.length === 0) {
        return { error: "Tài khoản của bạn chưa được phân quyền tại chi nhánh nào. Vui lòng liên hệ quản trị viên." };
      }
      if (!userBranches.includes(branch)) {
        return { error: `Tài khoản không được phân quyền tại chi nhánh ${branch}` };
      }
    }

    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await encrypt({ 
      userId: user.id, 
      username: user.username,
      employeeName: user.employeeName || user.username,
      activeBranch: branch,
      expires 
    });

    cookies().set("session", session, { expires, httpOnly: true, path: "/" });

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

