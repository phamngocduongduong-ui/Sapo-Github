import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ApprovalTabs from "../../nhan-su/phe-duyet/ApprovalTabs";

export default async function LaborContractApprovalPage() {
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

  const hasHopDongLD = isAdmin || permissions.has("PD_HOP_DONG_LD");
  if (!hasHopDongLD) {
    return (
      <div className="main-content" style={{ padding: "2rem" }}>
        <h1>Bạn không có quyền truy cập trang này.</h1>
      </div>
    );
  }

  const [pendingContracts, approvedContracts] = await Promise.all([
    (prisma as any).laborcontract.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
    (prisma as any).laborcontract.findMany({ where: { status: "Đã phê duyệt" }, orderBy: { createdAt: "desc" }, take: 100 })
  ]);

  const hrData = {
    pending: {
      contracts: pendingContracts
    },
    approved: {
      contracts: approvedContracts
    }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <ApprovalTabs 
        pending={hrData.pending}
        approved={hrData.approved}
        isEmbedded={false}
        showHopDongLaoDongOnly={true}
      />
    </div>
  );
}
