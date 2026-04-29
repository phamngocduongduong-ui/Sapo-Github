import { prisma } from "@/lib/db";
import AttendanceTable from "./AttendanceTable";

export default async function ChamCongPage() {
  const attendances = await prisma.attendance.findMany({
    orderBy: { createdAt: "desc" }
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

      <AttendanceTable initialData={attendances} />
    </main>
  );
}
