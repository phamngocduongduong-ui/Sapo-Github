import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, encrypt } from "@/lib/session";
import { cookies } from "next/headers";

async function updateSessionActiveBranch(sessionPayload: any, newBranch: string) {
  try {
    sessionPayload.activeBranch = newBranch;
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    sessionPayload.expires = expires;
    const newSession = await encrypt(sessionPayload);
    cookies().set("session", newSession, { expires, httpOnly: true, path: "/" });
  } catch (err) {
    console.error("Failed to update active branch session cookie:", err);
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      cookies().delete("session");
      return NextResponse.json({ permissions: [] }, { status: 401 });
    }

    const userId = session.userId;
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { username: true, role: true, employeeName: true, branch: true, permission: { select: { id: true } } }
    });

    if (!user) {
      cookies().delete("session");
      return NextResponse.json({ permissions: [] }, { status: 404 });
    }

    const activeBranches = (await (prisma as any).branch.findMany({
      where: { status: "ACTIVE" },
      select: { name: true }
    })).map((b: any) => b.name);

    const userBranches = user.branch 
      ? user.branch.split(",").map((b: string) => b.trim()).filter(Boolean).filter((b: string) => activeBranches.includes(b))
      : [];

    // Admin (username admin hoặc role Admin) có toàn quyền
    if (user.username === "admin" || user.role === "Admin") {
      const allowed = userBranches.length > 0 ? userBranches : activeBranches;
      const defaultBranch = allowed.length > 0 ? allowed[0] : "Toàn bộ chi nhánh";
      let currentActive = session.activeBranch || defaultBranch;

      if (!allowed.includes(currentActive)) {
        currentActive = defaultBranch;
        await updateSessionActiveBranch(session, currentActive);
      }

      return NextResponse.json({ 
        isAdmin: true, 
        username: user.username,
        role: user.role,
        employeeName: user.employeeName, 
        branch: currentActive,
        allowedBranches: allowed
      });
    }

    const permissionIds = (user as any).permission.map((p: any) => p.id);
    const allowed = userBranches;
    const defaultBranch = allowed.length > 0 ? allowed[0] : "Toàn bộ chi nhánh";
    let currentActive = session.activeBranch || defaultBranch;

    if (!allowed.includes(currentActive)) {
      currentActive = defaultBranch;
      await updateSessionActiveBranch(session, currentActive);
    }

    if (permissionIds.length === 0) {
      return NextResponse.json({ 
        permissions: [], 
        isAdmin: false,
        username: user.username,
        role: user.role,
        employeeName: user.employeeName,
        branch: currentActive,
        allowedBranches: allowed
      });
    }

    // Lấy chi tiết quyền từ các Mục quyền của User
    const permissions = await (prisma as any).permissiondetail.findMany({
      where: { 
        permissionId: { in: permissionIds }, 
        canAccess: true 
      },
      select: { moduleKey: true }
    });

    return NextResponse.json({ 
      permissions: Array.from(new Set(permissions.map((p: any) => p.moduleKey))),
      isAdmin: false,
      username: user.username,
      role: user.role,
      employeeName: user.employeeName,
      branch: currentActive,
      allowedBranches: allowed
    });

  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json({ permissions: [] }, { status: 500 });
  }
}
