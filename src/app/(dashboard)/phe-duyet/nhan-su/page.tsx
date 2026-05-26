import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ApprovalTabs from "../../nhan-su/phe-duyet/ApprovalTabs";

export default async function NhanSuApprovalPage() {
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

  const hasNhanSu = isAdmin || permissions.has("PD_NHAN_SU");
  if (!hasNhanSu) {
    return (
      <div className="main-content" style={{ padding: "2rem" }}>
        <h1>Bạn không có quyền truy cập trang này.</h1>
      </div>
    );
  }

  const [
    pendingLeaves, approvedLeaves,
    pendingSalaryChanges, approvedSalaryChanges,
    pendingTransfers, approvedTransfers,
    pendingResignations, approvedResignations
  ] = await Promise.all([
    (prisma as any).leaverequest.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
    (prisma as any).leaverequest.findMany({ where: { status: "Đã phê duyệt" }, orderBy: { createdAt: "desc" }, take: 100 }),
    
    (prisma as any).salarychange.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
    (prisma as any).salarychange.findMany({ where: { status: "Đã phê duyệt" }, orderBy: { createdAt: "desc" }, take: 100 }),
    
    (prisma as any).transferpromotion.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
    (prisma as any).transferpromotion.findMany({ where: { status: "Đã phê duyệt" }, orderBy: { createdAt: "desc" }, take: 100 }),
    
    (prisma as any).resignation.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
    (prisma as any).resignation.findMany({ where: { status: "Đã phê duyệt" }, orderBy: { createdAt: "desc" }, take: 100 })
  ]);

  const hrData = {
    pending: {
      leaves: pendingLeaves,
      salaryChanges: pendingSalaryChanges,
      transfers: pendingTransfers,
      resignations: pendingResignations
    },
    approved: {
      leaves: approvedLeaves,
      salaryChanges: approvedSalaryChanges,
      transfers: approvedTransfers,
      resignations: approvedResignations
    }
  };

  return (
    <ApprovalTabs 
      pending={hrData.pending}
      approved={hrData.approved}
      isEmbedded={false}
      showNhanSuOnly={true}
    />
  );
}
