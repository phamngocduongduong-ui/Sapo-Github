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

    // Admin (username admin hoặc role Admin) có toàn quyền
    if (user.username === "admin" || user.role === "Admin") {
      const allBranches = await (prisma as any).branch.findMany({ select: { name: true } });
      const branchStr = allBranches.map((b: any) => b.name).join(", ");
      return NextResponse.json({ 
        isAdmin: true, 
        employeeName: user.employeeName, 
        branch: branchStr || "Toàn bộ chi nhánh" 
      });
    }

    const permissionIds = (user as any).permission.map((p: any) => p.id);
    if (permissionIds.length === 0) {
      return NextResponse.json({ permissions: [], isAdmin: false });
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
      employeeName: user.employeeName,
      branch: user.branch
    });

  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json({ permissions: [] }, { status: 500 });
  }
}
