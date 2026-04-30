import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ApprovalTabs from "./ApprovalTabs";

export default async function PheDuyetPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { permission: { include: { details: true } } }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const hasApprovePerm = isAdmin || (user?.permission?.details.some(d => d.moduleKey === "NS_APPROVE" && d.canAccess) ?? false);

  if (!hasApprovePerm) {
    return <div className="main-content"><h1>Bạn không có quyền truy cập trang này.</h1></div>;
  }

  // Fetch all pending records
  const [
    pendingContracts,
    pendingLeaves,
    pendingSalaryChanges,
    pendingTransfers,
    pendingResignations,
    pendingPayrolls
  ] = await Promise.all([
    prisma.laborContract.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
    prisma.leaveRequest.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
    prisma.salaryChange.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
    prisma.transferPromotion.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
    (prisma as any).resignation.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
    prisma.payroll.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } })
  ]);

  return (
    <main className="main-content">
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <h1 className="page-title">✅ Phê duyệt hồ sơ Nhân sự</h1>
        <p style={{ color: "#64748b" }}>Quản lý và xét duyệt các yêu cầu chờ phê duyệt trong hệ thống</p>
      </div>

      <ApprovalTabs 
        contracts={pendingContracts as any}
        leaves={pendingLeaves as any}
        salaryChanges={pendingSalaryChanges as any}
        transfers={pendingTransfers as any}
        resignations={pendingResignations as any}
        payrolls={pendingPayrolls as any}
      />
    </main>
  );
}
