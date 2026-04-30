import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ permissions: [] }, { status: 401 });
    }

    const userId = session.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, role: true, permissionId: true }
    });

    if (!user) {
      return NextResponse.json({ permissions: [] }, { status: 404 });
    }

    // Admin (username admin hoặc role Admin) có toàn quyền
    if (user.username === "admin" || user.role === "Admin") {
      return NextResponse.json({ isAdmin: true });
    }

    if (!user.permissionId) {
      return NextResponse.json({ permissions: [], isAdmin: false });
    }

    // Lấy chi tiết quyền từ Mục quyền của User
    const permissions = await prisma.permissionDetail.findMany({
      where: { permissionId: user.permissionId, canAccess: true },
      select: { moduleKey: true }
    });

    return NextResponse.json({ 
      permissions: permissions.map(p => p.moduleKey),
      isAdmin: false
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json({ permissions: [] }, { status: 500 });
  }
}
