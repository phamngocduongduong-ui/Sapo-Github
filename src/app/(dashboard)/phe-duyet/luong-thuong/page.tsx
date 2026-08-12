import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ApprovalTabs from "../../nhan-su/phe-duyet/ApprovalTabs";

export const dynamic = "force-dynamic";

export default async function PayrollApprovalPage({ searchParams }: { searchParams?: { embedded?: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const isEmbedded = searchParams?.embedded === "true";

  const user = await (prisma as any).user.findUnique({
    where: { id: session.userId },
    include: { permission: { include: { permissiondetail: true } } }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const permissions = new Set<string>();
  if (user?.permission) {
    user.permission.forEach((p: any) => {
      p.permissiondetail?.forEach((d: any) => {
        if (d.canAccess) {
          permissions.add(d.moduleKey);
        }
      });
    });
  }

  const hasLuongThuong = isAdmin || permissions.has("PD_LUONG_THUONG") || permissions.has("NS_BANG_LUONG") || permissions.has("PHE_DUYET");
  if (!hasLuongThuong) {
    return (
      <div className="main-content" style={{ padding: "2rem" }}>
        <h1>Bạn không có quyền truy cập trang này.</h1>
      </div>
    );
  }

  const activeBranch = session.activeBranch || user?.branch?.split(",")[0]?.trim() || "";
  const isHQ = !activeBranch || 
               activeBranch.toUpperCase().includes("HCM") || 
               activeBranch.toUpperCase().includes("HỒ CHÍ MINH") || 
               activeBranch.toUpperCase().includes("HO CHI MINH") ||
               activeBranch.toUpperCase().includes("TOÀN BỘ");

  const cleanBranch = isHQ ? "" : activeBranch.replace(/SAPO|VP\./gi, "").trim();

  const branchFilter = (!isHQ && cleanBranch) ? { branch: { contains: cleanBranch } } : {};

  const [pendingPayrolls, approvedPayrolls] = await Promise.all([
    prisma.payroll.findMany({ where: { status: "Chờ phê duyệt", ...branchFilter }, orderBy: { createdAt: "desc" } }),
    prisma.payroll.findMany({ where: { status: "Đã phê duyệt", ...branchFilter }, orderBy: { createdAt: "desc" }, take: 100 })
  ]);

  const hrData = {
    pending: {
      payrolls: pendingPayrolls
    },
    approved: {
      payrolls: approvedPayrolls
    }
  };

  return (
    <ApprovalTabs 
      pending={hrData.pending}
      approved={hrData.approved}
      isEmbedded={isEmbedded}
      showLuongThuongOnly={true}
    />
  );
}
