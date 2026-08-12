import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, encrypt } from "@/lib/session";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

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
      select: { username: true, role: true, employeeName: true, branch: true, status: true, permission: { select: { id: true } } }
    });

    if (!user || user.status === "INACTIVE") {
      cookies().delete("session");
      return NextResponse.json({ permissions: [], error: "Tài khoản của bạn đã bị ngưng hoạt động hoặc ngắt kết nối" }, { status: 401 });
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
        allowedBranches: allowed,
        permHash: `ADMIN:${user.role || ""}:${user.branch || ""}`
      });
    }

    const permissionIds = (user as any).permission.map((p: any) => p.id).sort();
    const allowed = userBranches;
    const defaultBranch = allowed.length > 0 ? allowed[0] : "Toàn bộ chi nhánh";
    let currentActive = session.activeBranch || defaultBranch;

    if (!allowed.includes(currentActive)) {
      currentActive = defaultBranch;
      await updateSessionActiveBranch(session, currentActive);
    }

    if (permissionIds.length === 0) {
      const permHash = `${user.role || ""}:${user.branch || ""}:EMPTY`;
      return NextResponse.json({ 
        permissions: [], 
        isAdmin: false,
        username: user.username,
        role: user.role,
        employeeName: user.employeeName,
        branch: currentActive,
        allowedBranches: allowed,
        permHash
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

    const uniquePerms = Array.from(new Set(permissions.map((p: any) => p.moduleKey))).sort();
    const permHash = `${user.role || ""}:${user.branch || ""}:${permissionIds.join(",")}:${uniquePerms.join(",")}`;

    return NextResponse.json({ 
      permissions: uniquePerms,
      isAdmin: false,
      username: user.username,
      role: user.role,
      employeeName: user.employeeName,
      branch: currentActive,
      allowedBranches: allowed,
      permHash
    });

  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json({ permissions: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    if (body.activeBranch) {
      await updateSessionActiveBranch(session, body.activeBranch);
      return NextResponse.json({ success: true, activeBranch: body.activeBranch });
    }
    return NextResponse.json({ error: "Missing activeBranch" }, { status: 400 });
  } catch (error) {
    console.error("Error updating active branch:", error);
    return NextResponse.json({ error: "Failed to update active branch" }, { status: 500 });
  }
}
