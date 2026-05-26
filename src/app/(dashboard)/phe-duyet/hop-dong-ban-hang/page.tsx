import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ApprovalTabs from "../../nhan-su/phe-duyet/ApprovalTabs";

export default async function SalesContractApprovalPage() {
  const session = await getSession();
  if (!session) redirect("/login");

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

  const hasHopDongBH = isAdmin || permissions.has("PD_HOP_DONG_BH");
  if (!hasHopDongBH) {
    return (
      <div className="main-content" style={{ padding: "2rem" }}>
        <h1>Bạn không có quyền truy cập trang này.</h1>
      </div>
    );
  }

  const [pendingSalesContracts, approvedSalesContracts] = await Promise.all([
    (prisma as any).contract.findMany({ where: { status: "Chờ phê duyệt" }, include: { contractitem: true }, orderBy: { createdAt: "desc" } }),
    (prisma as any).contract.findMany({ where: { status: "Đã phê duyệt" }, include: { contractitem: true }, orderBy: { createdAt: "desc" }, take: 100 })
  ]);

  const hrData = {
    pending: {
      salesContracts: pendingSalesContracts
    },
    approved: {
      salesContracts: approvedSalesContracts
    }
  };

  return (
    <ApprovalTabs 
      pending={hrData.pending}
      approved={hrData.approved}
      isEmbedded={false}
      showHopDongBanHangOnly={true}
    />
  );
}
