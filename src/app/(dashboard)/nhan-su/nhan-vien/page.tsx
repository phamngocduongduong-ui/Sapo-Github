import { prisma } from "@/lib/db";
import EmployeeTable from "./EmployeeTable";
import { getSession } from "@/lib/session";

export default async function NhanVienPage() {
  const session = await getSession();
  const user = await prisma.user.findUnique({
    where: { id: session?.userId || "" }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const userBranches = user?.branch ? user.branch.split(",").map(b => b.trim()).filter(Boolean) : [];

  const employees = await prisma.employee.findMany({
    where: isAdmin ? {} : {
      branch: { in: userBranches }
    },
    orderBy: { createdAt: "desc" }
  });



  const branches = await prisma.branch.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true }
  });

  const positions = await prisma.position.findMany({
    where: { status: "ACTIVE" },
    select: { name: true }
  });

  const departments = await prisma.department.findMany({
    where: { status: "ACTIVE" },
    select: { name: true }
  });


  return (
    <main className="main-content" style={{ padding: "2rem", width: "100%" }}>
      <h1 className="page-title" style={{ marginBottom: "0.25rem" }}>
        🧑‍💼 Quản lý Nhân viên
      </h1>
      <p style={{ color: "#888", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Danh sách và thông tin toàn bộ nhân viên trong doanh nghiệp
      </p>

      <div className="card" style={{ padding: "1.5rem" }}>
        <EmployeeTable 
          initialEmployees={employees as any} 
          branches={isAdmin ? branches.map(b => b.name) : branches.map(b => b.name).filter(b => userBranches.includes(b))}
          activePositions={positions.map(p => p.name)}
          activeDepartments={departments.map(d => d.name)}
          currentUserName={user?.employeeName || user?.username || "Admin"}
        />
      </div>

    </main>
  );
}
