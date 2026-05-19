import { prisma } from "@/lib/db";
import MaterialPlanTable from "./MaterialPlanTable";
import { getSession } from "@/lib/session";

export default async function KeHoachVatTuPage() {
  const session = await getSession();

  // Lấy danh sách kế hoạch vật tư
  const plans = await (prisma as any).materialplan.findMany({
    include: { 
      order: {
        include: { orderitem: true }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  // Lấy danh sách chi tiết hàng hóa của các đơn hàng "Chờ kế hoạch sản xuất" và chưa có kế hoạch
  const pendingItems = await (prisma as any).orderitem.findMany({
    where: {
      order: {
        status: "Chờ kế hoạch sản xuất",
        materialPlanId: null
      }
    },
    include: {
      order: true
    },
    orderBy: {
      order: { orderCode: "asc" }
    }
  });

  return (
    <main className="main-content" style={{ padding: "2rem", width: "100%" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 className="page-title">📋 Kế hoạch vật tư</h1>
        <p style={{ color: "#888", fontSize: "0.95rem" }}>Lập kế hoạch dựa trên chi tiết hàng hóa của các đơn đặt hàng.</p>
      </header>

      <div className="card" style={{ padding: "1.5rem" }}>
        <MaterialPlanTable 
          initialPlans={JSON.parse(JSON.stringify(plans))}
          pendingItems={JSON.parse(JSON.stringify(pendingItems))}
          currentUser={session?.employeeName || "Unknown"}
        />
      </div>
    </main>
  );
}
