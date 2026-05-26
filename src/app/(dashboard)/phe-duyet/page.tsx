import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ApprovalCenterTabs from "./ApprovalCenterTabs";

export default async function ApprovalCenterPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await (prisma as any).user.findUnique({
    where: { id: session.userId },
    include: { permission: { include: { permissiondetail: true } } }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  
  // Resolve user permissions
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

  const hasPHE_DUYET = isAdmin || permissions.has("PHE_DUYET");
  const hasNhanSu = isAdmin || permissions.has("PD_NHAN_SU");
  const hasMuaHang = isAdmin || permissions.has("PD_MUA_HANG");
  const hasBaoTri = isAdmin || permissions.has("PD_BAO_TRI");

  if (!hasPHE_DUYET) {
    return (
      <div className="main-content" style={{ padding: "2rem" }}>
        <h1>Bạn không có quyền truy cập trang này.</h1>
      </div>
    );
  }

  // Fetch HR approval data if user has PD_NHAN_SU
  let hrData = {
    pending: {
      contracts: [],
      leaves: [],
      salaryChanges: [],
      transfers: [],
      resignations: [],
      payrolls: [],
      purchaseOrders: []
    },
    approved: {
      contracts: [],
      leaves: [],
      salaryChanges: [],
      transfers: [],
      resignations: [],
      payrolls: [],
      purchaseOrders: []
    }
  };

  if (hasNhanSu) {
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

    hrData = {
      pending: {
        contracts: pendingContracts,
        leaves: pendingLeaves,
        salaryChanges: pendingSalaryChanges,
        transfers: pendingTransfers,
        resignations: pendingResignations,
        payrolls: pendingPayrolls,
        purchaseOrders: pendingPurchaseOrders
      },
      approved: {
        contracts: approvedContracts,
        leaves: approvedLeaves,
        salaryChanges: approvedSalaryChanges,
        transfers: approvedTransfers,
        resignations: approvedResignations,
        payrolls: approvedPayrolls,
        purchaseOrders: approvedPurchaseOrders
      }
    };
  }

  return (
    <div style={{ padding: "1rem" }}>
      <ApprovalCenterTabs 
        hasNhanSu={hasNhanSu}
        hasMuaHang={hasMuaHang}
        hasBaoTri={hasBaoTri}
        hrData={hrData}
      />
    </div>
  );
}
