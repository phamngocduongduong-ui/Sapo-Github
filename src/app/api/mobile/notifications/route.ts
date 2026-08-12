import { NextRequest, NextResponse } from "next/server";
import { getNotifications } from "@/app/(dashboard)/nhan-su/tang-giam-luong/actions";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ notifications: [], pendingCount: 0, recentPendingItems: [] });
    }

    const notifications = await getNotifications(10);
    
    const user = await (prisma as any).user.findUnique({
      where: { id: session.userId },
      select: { username: true, role: true, status: true, branch: true, permission: { select: { id: true } } }
    });

    if (!user || user.status === "INACTIVE") {
      cookies().delete("session");
      return NextResponse.json({ error: "Tài khoản bị ngưng hoạt động" }, { status: 401 });
    }

    const isAdmin = user?.username === "admin" || user?.role === "Admin";
    let userPermissions: string[] = [];
    const permissionIds = (user.permission || []).map((p: any) => p.id).sort();

    if (isAdmin) {
      userPermissions = ["ALL"];
    } else {
      if (permissionIds.length > 0) {
        const details = await (prisma as any).permissiondetail.findMany({
          where: { permissionId: { in: permissionIds }, canAccess: true },
          select: { moduleKey: true }
        });
        userPermissions = Array.from(new Set<string>(details.map((d: any) => d.moduleKey))).sort();
      }
    }

    const permHash = isAdmin 
      ? `ADMIN:${user.role || ""}:${user.branch || ""}`
      : `${user.role || ""}:${user.branch || ""}:${permissionIds.join(",")}:${userPermissions.join(",")}`;

    // Active branch determination
    const activeBranchParam = req.nextUrl.searchParams.get("branch");
    const activeBranch = activeBranchParam || session?.activeBranch || user.branch?.split(",")[0]?.trim() || "";

    const isHQ = !activeBranch || 
                 activeBranch.toUpperCase().includes("HCM") || 
                 activeBranch.toUpperCase().includes("HỒ CHÍ MINH") || 
                 activeBranch.toUpperCase().includes("HO CHI MINH") ||
                 activeBranch.toUpperCase().includes("TOÀN BỘ");

    const cleanBranchName = isHQ ? "" : activeBranch.replace(/SAPO|VP\./gi, "").trim();

    // Check user module access permissions
    const hasProposalAccess = isAdmin || userPermissions.some((p: string) => ["PD_DE_NGHI_MH", "TM_PHE_DUYET_DE_NGHI", "TM_DE_NGHI"].includes(p));
    const hasLeaveAccess = isAdmin || userPermissions.some((p: string) => ["PD_NHAN_SU", "NS_APPROVE"].includes(p));
    const hasContractAccess = isAdmin || userPermissions.some((p: string) => ["PD_HOP_DONG_BH", "BH_HOP_DONG", "KD_HOP_DONG"].includes(p));

    const branchFilter = (!isHQ && cleanBranchName) ? { branch: { contains: cleanBranchName } } : {};

    // Count pending items accurately according to permissions AND branch
    const proposalWhere = hasProposalAccess ? {
      status: { in: ["Chờ duyệt", "CHỜ PHÊ DUYỆT", "Chờ phê duyệt", "PENDING"] },
      ...branchFilter
    } : null;

    const leaveWhere = hasLeaveAccess ? {
      status: "Chờ phê duyệt",
      ...branchFilter
    } : null;

    const contractWhere = hasContractAccess ? {
      status: "Chờ phê duyệt"
    } : null;

    const proposalCount = proposalWhere ? await (prisma as any).purchasingproposal.count({ where: proposalWhere }).catch(() => 0) : 0;
    const leaveCount = leaveWhere ? await (prisma as any).leaverequest.count({ where: leaveWhere }).catch(() => 0) : 0;
    const contractCount = contractWhere ? await (prisma as any).contract.count({ where: contractWhere }).catch(() => 0) : 0;

    // Fetch recent pending items for list display
    const pendingLeaves = leaveWhere ? await (prisma as any).leaverequest.findMany({
      where: leaveWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, leaveCode: true, employeeName: true, totalDays: true, reason: true, createdAt: true }
    }).catch(() => []) : [];

    const pendingProposals = proposalWhere ? await (prisma as any).purchasingproposal.findMany({
      where: proposalWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, code: true, proposerName: true, title: true, totalAmount: true, createdAt: true }
    }).catch(() => []) : [];

    const pendingContracts = contractWhere ? await (prisma as any).contract.findMany({
      where: contractWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, contractNumber: true, customerName: true, value: true, createdAt: true }
    }).catch(() => []) : [];

    // Combine recent pending items
    const recentPendingItems = [
      ...pendingLeaves.map((l: any) => ({
        id: l.id,
        code: l.leaveCode,
        type: "Nghỉ phép",
        title: `Đơn xin nghỉ phép (${l.totalDays} ngày)`,
        subtitle: `${l.employeeName} • ${l.reason}`,
        date: l.createdAt,
        href: "/phe-duyet/nhan-su",
        badgeColor: "#ea580c"
      })),
      ...pendingProposals.map((p: any) => ({
        id: p.id,
        code: p.code || "DNMH",
        type: "Mua hàng",
        title: p.title || "Đề nghị mua hàng vật tư",
        subtitle: `${p.proposerName || "Nhân viên"} • ${p.totalAmount ? Number(p.totalAmount).toLocaleString("vi-VN") + "đ" : "Chờ duyệt"}`,
        date: p.createdAt,
        href: "/phe-duyet/de-nghi-mua-hang",
        badgeColor: "#2563eb"
      })),
      ...pendingContracts.map((c: any) => ({
        id: c.id,
        code: c.contractNumber || "HĐ",
        type: "Hợp đồng",
        title: `Hợp đồng: ${c.customerName || "Khách hàng"}`,
        subtitle: `Giá trị: ${c.value ? Number(c.value).toLocaleString("vi-VN") + "đ" : "---"}`,
        date: c.createdAt,
        href: "/phe-duyet/hop-dong-ban-hang",
        badgeColor: "#0284c7"
      }))
    ];

    const totalPending = proposalCount + leaveCount + contractCount;

    return NextResponse.json({
      notifications,
      pendingCount: totalPending,
      proposalCount,
      leaveCount,
      contractCount,
      unreadNotifCount: notifications.filter((n: any) => !n.isRead).length,
      recentPendingItems,
      permissions: userPermissions,
      permHash
    });
  } catch (error) {
    console.error("Error fetching mobile notifications:", error);
    return NextResponse.json({ notifications: [], pendingCount: 0, recentPendingItems: [] }, { status: 500 });
  }
}
