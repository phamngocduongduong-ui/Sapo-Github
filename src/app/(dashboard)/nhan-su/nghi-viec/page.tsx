import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ResignationTable from "./ResignationTable";
import { getResignations } from "./actions";

export default async function NghiViecPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { permission: { include: { details: true } } }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const canApprove = isAdmin || (user?.permission?.details.some(d => d.moduleKey === "NS_APPROVE" && d.canAccess) ?? false);

  const [resignations, employees] = await Promise.all([
    getResignations(),
    prisma.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, fullName: true, employeeCode: true },
      orderBy: { fullName: "asc" }
    })
  ]);

  return (
    <main className="main-content" style={{ padding: "2rem", width: "100%" }}>
      <div className="page-header" style={{ marginBottom: "2rem" }}>
        <h1 className="page-title">📄 Quản lý Nghỉ việc</h1>
        <p style={{ color: "#64748b" }}>Quản lý các yêu cầu thôi việc và cập nhật trạng thái nhân sự tự động</p>
      </div>

      <ResignationTable 
        initialData={resignations} 
        employees={employees}
        canApprove={canApprove}
      />
    </main>
  );
}
