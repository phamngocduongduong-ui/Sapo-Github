import { prisma } from "@/lib/db";
import EmployeeTable from "./EmployeeTable";

export default async function NhanVienPage() {
  const employees = await prisma.employee.findMany({
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
          branches={branches}
          activePositions={positions.map(p => p.name)}
          activeDepartments={departments.map(d => d.name)}
        />
      </div>
    </main>
  );
}
