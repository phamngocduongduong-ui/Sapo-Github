import { prisma } from "@/lib/db";
import OrderTable from "./OrderTable";
import { getSession } from "@/lib/session";

export default async function DonHangPage() {
  const session = await getSession();
  
  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  // Lấy danh sách khách hàng để chọn trong form
  const customers = await prisma.customer.findMany({ select: { code: true } });
  
  // Lấy danh sách chi nhánh để chọn trong form
  const branches = await prisma.branch.findMany({ where: { status: "ACTIVE" }, select: { name: true } });

  // Lấy danh sách nhân viên bộ phận Kinh doanh để phục vụ bộ lọc
  const salesEmployees = await prisma.employee.findMany({
    where: { department: "Kinh doanh" },
    select: { fullName: true }
  });

  return (
    <main className="main-content" style={{ padding: "2rem", width: "100%" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 className="page-title">📦 Quản lý Đơn hàng (Kinh doanh)</h1>
        <p style={{ color: "#888", fontSize: "0.95rem" }}>Theo dõi, lọc và quản lý chi tiết các đơn đặt hàng.</p>
      </header>

      <div className="card" style={{ padding: "1.5rem" }}>
        <OrderTable 
          initialOrders={JSON.parse(JSON.stringify(orders))} 
          customers={customers.map(c => c.code)}
          branches={branches.map(b => b.name)}
          salesEmployees={salesEmployees.map(e => e.fullName)}
          currentUser={session?.employeeName || "Unknown"}
        />
      </div>
    </main>
  );
}
