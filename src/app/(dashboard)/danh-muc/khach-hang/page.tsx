import { prisma } from "@/lib/db";
import CustomerTable from "./CustomerTable";

export default async function KhachHangPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="main-content" style={{ padding: "2rem", width: "100%" }}>
      <h1 className="page-title">👥 Danh mục Khách hàng</h1>
      <div className="card" style={{ padding: "1.5rem" }}>
        <CustomerTable initialCustomers={customers} />
      </div>
    </main>
  );
}
