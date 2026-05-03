import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import LeaveRequestTable from "./LeaveRequestTable";
import { redirect } from "next/navigation";

export default async function NghiPhepPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { permission: { include: { permissiondetail: true } } }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const hasApprovePerm = isAdmin || ((user as any)?.permission?.some((p: any) => p.permissiondetail?.some((d: any) => d.moduleKey === "NS_APPROVE" && d.canAccess)) ?? false);

  const isEmployee = user?.role !== "Admin" && user?.role !== "Manager" && user?.role !== "HR";
  const userName = user?.employeeName || user?.username || "";

  const requests = await (prisma as any).leaverequest.findMany({
    where: isEmployee ? {
      employeeName: userName
    } : {},
    orderBy: { createdAt: "desc" },
  });




  return (
    <main className="main-content" style={{ padding: "2rem", width: "100%" }}>
      <h1 className="page-title" style={{ marginBottom: "0.25rem" }}>
        🏖️ Quản lý Nghỉ phép
      </h1>
      <p style={{ color: "#888", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Đăng ký và theo dõi trạng thái nghỉ phép cá nhân
      </p>

      <div className="card" style={{ padding: "1.5rem" }}>
        <LeaveRequestTable 
          initialRequests={requests as any} 
          currentUserName={userName} 
          isAdmin={isAdmin}
          userRole={user?.role || ""}
          hasApprovePerm={hasApprovePerm}
        />
      </div>
    </main>
  );
}
