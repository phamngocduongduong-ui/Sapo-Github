import { prisma } from "@/lib/db";
import DepartmentTable from "./DepartmentTable";

export default async function BoPhanPage() {
  const departments = await prisma.department.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="main-content" style={{ padding: "2rem", width: "100%" }}>
      <h1 className="page-title" style={{ marginBottom: "0.25rem" }}>
        🏢 Quản lý Bộ phận
      </h1>
      <p style={{ color: "#888", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Danh mục các bộ phận trong doanh nghiệp
      </p>

      <div className="card" style={{ padding: "1.5rem" }}>
        <DepartmentTable initialDepartments={departments as any} />
      </div>
    </main>
  );
}
