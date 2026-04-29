import { prisma } from "@/lib/db";
import PositionTable from "./PositionTable";

export default async function ChucVuPage() {
  const positions = await prisma.position.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="main-content" style={{ padding: "2rem", width: "100%" }}>
      <h1 className="page-title" style={{ marginBottom: "0.25rem" }}>
        🎖️ Quản lý Chức vụ
      </h1>
      <p style={{ color: "#888", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Danh mục các chức vụ trong hệ thống nhân sự
      </p>

      <div className="card" style={{ padding: "1.5rem" }}>
        <PositionTable initialPositions={positions as any} />
      </div>
    </main>
  );
}
