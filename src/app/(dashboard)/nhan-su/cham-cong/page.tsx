import { prisma } from "@/lib/db";
import AttendanceTable from "./AttendanceTable";
import { getSession } from "@/lib/session";

export default async function ChamCongPage() {
  const session = await getSession();
  const user = await prisma.user.findUnique({
    where: { id: session?.userId || "" }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const userBranches = user?.branch ? user.branch.split(",").map(b => b.trim()).filter(Boolean) : [];

  const attendances = await prisma.attendance.findMany({
    where: isAdmin ? {} : {
      branch: { in: userBranches }
    },
    orderBy: { createdAt: "desc" }
  });

  const eligibleEmployees = await (prisma as any).employee.findMany({
    where: {
      status: "ACTIVE",
      branch: isAdmin ? undefined : { in: userBranches }
    },
    select: {
      employeeCode: true,
      fullName: true,
      department: true
    }
  });


  return (
    <main className="main-content">
      <div className="page-header" style={{ marginBottom: "2rem" }}>
        <h1 className="page-title" style={{ marginBottom: "0.25rem" }}>
          🕐 Chấm công
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
          Quản lý và theo dõi dữ liệu chấm công của nhân viên
        </p>
      </div>

      <AttendanceTable initialData={attendances} eligibleEmployees={eligibleEmployees} />
    </main>
  );
}
