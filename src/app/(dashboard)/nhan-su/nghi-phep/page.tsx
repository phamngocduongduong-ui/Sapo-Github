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

  const userName = user?.employeeName || user?.username || "";
  
  // Only Admin sees all. Everyone else (including HR/Manager) only sees their own.
  const whereClause = isAdmin ? {} : { employeeName: userName };

  const requests = await (prisma as any).leaverequest.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  });




  return (
    <LeaveRequestTable 
      initialRequests={requests as any} 
      currentUserName={userName} 
      isAdmin={isAdmin}
      userRole={user?.role || ""}
      hasApprovePerm={hasApprovePerm}
    />
  );
}
