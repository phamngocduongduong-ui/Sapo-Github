import { prisma } from "@/lib/db";
import DispatchTable from "./DispatchTable";

export default async function DispatchPage() {
  const orders = await (prisma as any).dispatchorder.findMany({
    orderBy: { createdAt: "desc" },
  });

  const activeEmployees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    select: { fullName: true },
    orderBy: { fullName: "asc" }
  });

  return (
    <main className="main-content" style={{ padding: "2rem", width: "100%" }}>
      <h1 className="page-title" style={{ marginBottom: "0.25rem" }}>
        🚚 Lệnh điều động
      </h1>
      <p style={{ color: "#888", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Quản lý các lệnh điều động nhân viên trong bộ phận Thu mua
      </p>

      <div className="card" style={{ padding: "1.5rem" }}>
        <DispatchTable initialOrders={orders} activeEmployees={activeEmployees.map(e => e.fullName)} />
      </div>
    </main>
  );
}
