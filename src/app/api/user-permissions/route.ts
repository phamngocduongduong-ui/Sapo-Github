import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { cookies } from "next/headers";

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
      return NextResponse.json({ 
        isAdmin: true, 
        username: user.username,
        role: user.role,
        employeeName: user.employeeName, 
        branch: session.activeBranch || defaultBranch,
        allowedBranches: allowed
      });
    }

    const permissionIds = (user as any).permission.map((p: any) => p.id);
    const allowed = userBranches;

    if (permissionIds.length === 0) {
      return NextResponse.json({ 
        permissions: [], 
        isAdmin: false,
        username: user.username,
        role: user.role,
        employeeName: user.employeeName,
        branch: session.activeBranch || allowed[0] || "Toàn bộ chi nhánh",
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
      branch: session.activeBranch || allowed[0] || "Toàn bộ chi nhánh",
      allowedBranches: allowed
    });

  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json({ permissions: [] }, { status: 500 });
  }
}
