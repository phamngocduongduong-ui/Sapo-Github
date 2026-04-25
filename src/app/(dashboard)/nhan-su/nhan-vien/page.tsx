import { firestoreEmployees } from "@/lib/firestore-employees";
import EmployeeTable from "./EmployeeTable";

export default async function NhanVienPage() {
  const employees = await firestoreEmployees.getAll();

  // Chuyển đổi Firestore Timestamp hoặc các đối tượng Date thành JSON-serializable if needed
  // Tuy nhiên Next.js Server Components có thể truyền Date object nếu nó là server component
  // Nhưng tốt nhất là map để đảm bảo kiểu dữ liệu đồng nhất.
  const serializedEmployees = employees.map(e => ({
    ...e,
    id: e.id || "",
    idCardDate: e.idCardDate ? (e.idCardDate.toDate ? e.idCardDate.toDate() : new Date(e.idCardDate)) : null,
    startDate: e.startDate ? (e.startDate.toDate ? e.startDate.toDate() : new Date(e.startDate)) : null,
    endDate: e.endDate ? (e.endDate.toDate ? e.endDate.toDate() : new Date(e.endDate)) : null,
    createdAt: e.createdAt ? (e.createdAt.toDate ? e.createdAt.toDate() : new Date(e.createdAt)) : new Date(),
    updatedAt: e.updatedAt ? (e.updatedAt.toDate ? e.updatedAt.toDate() : new Date(e.updatedAt)) : new Date(),
  }));

  return (
    <main className="main-content" style={{ padding: "2rem", width: "100%" }}>
      <h1 className="page-title" style={{ marginBottom: "0.25rem" }}>
        🧑‍💼 Quản lý Nhân viên
      </h1>
      <p style={{ color: "#888", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Danh sách và thông tin toàn bộ nhân viên trong doanh nghiệp
      </p>

      <div className="card" style={{ padding: "1.5rem" }}>
        <EmployeeTable initialEmployees={serializedEmployees as any} />
      </div>
    </main>
  );
}
