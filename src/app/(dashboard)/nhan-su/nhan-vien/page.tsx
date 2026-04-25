import { prisma } from "@/lib/db";
import EmployeeTable from "./EmployeeTable";

export default async function NhanVienPage() {
  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: "desc" },
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
        <EmployeeTable initialEmployees={employees} />
      </div>
    </main>
  );
}
