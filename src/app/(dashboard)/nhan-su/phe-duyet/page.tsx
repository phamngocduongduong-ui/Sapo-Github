import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ApprovalTabs from "./ApprovalTabs";

export default async function PheDuyetPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await (prisma as any).user.findUnique({
    where: { id: session.userId },
    include: { permission: { include: { permissiondetail: true } } }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const hasApprovePerm = isAdmin || ((user as any)?.permission?.some((p: any) => p.permissiondetail?.some((d: any) => d.moduleKey === "NS_APPROVE" && d.canAccess)) ?? false);


  if (!hasApprovePerm) {
    return <div className="main-content"><h1>Bạn không có quyền truy cập trang này.</h1></div>;
  }

  // Fetch all pending and approved records
  const [
    pendingContracts, approvedContracts,
    pendingLeaves, approvedLeaves,
    pendingSalaryChanges, approvedSalaryChanges,
    pendingTransfers, approvedTransfers,
    pendingResignations, approvedResignations,
    pendingPayrolls, approvedPayrolls,
    pendingPurchaseOrders, approvedPurchaseOrders
  ] = await Promise.all([
    (prisma as any).laborcontract.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
    (prisma as any).laborcontract.findMany({ where: { status: "Đã phê duyệt" }, orderBy: { createdAt: "desc" }, take: 100 }),
    
    (prisma as any).leaverequest.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
    (prisma as any).leaverequest.findMany({ where: { status: "Đã phê duyệt" }, orderBy: { createdAt: "desc" }, take: 100 }),
    
    (prisma as any).salarychange.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
    (prisma as any).salarychange.findMany({ where: { status: "Đã phê duyệt" }, orderBy: { createdAt: "desc" }, take: 100 }),
    
    (prisma as any).transferpromotion.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
    (prisma as any).transferpromotion.findMany({ where: { status: "Đã phê duyệt" }, orderBy: { createdAt: "desc" }, take: 100 }),
    
    (prisma as any).resignation.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
    (prisma as any).resignation.findMany({ where: { status: "Đã phê duyệt" }, orderBy: { createdAt: "desc" }, take: 100 }),
    
    prisma.payroll.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
    prisma.payroll.findMany({ where: { status: "Đã phê duyệt" }, orderBy: { createdAt: "desc" }, take: 100 }),

    (prisma as any).purchaseorder.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
    (prisma as any).purchaseorder.findMany({ where: { status: "Đã phê duyệt" }, orderBy: { createdAt: "desc" }, take: 100 })
  ]);

  return (
    <ApprovalTabs 
      pending={{
        contracts: pendingContracts,
        leaves: pendingLeaves,
        salaryChanges: pendingSalaryChanges,
        transfers: pendingTransfers,
        resignations: pendingResignations,
        payrolls: pendingPayrolls,
        purchaseOrders: pendingPurchaseOrders
      }}
      approved={{
        contracts: approvedContracts,
        leaves: approvedLeaves,
        salaryChanges: approvedSalaryChanges,
        transfers: approvedTransfers,
        resignations: approvedResignations,
        payrolls: approvedPayrolls,
        purchaseOrders: approvedPurchaseOrders
      }}
    />
  );
}
