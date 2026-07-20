import { prisma } from "@/lib/db";
import DeliveryPlanTable from "./DeliveryPlanTable";
import { getSession } from "@/lib/session";

export default async function DeliveryPlanPage() {
  const session = await getSession();
  
  const activeBranch = session?.activeBranch;
  const isHQ = activeBranch === "Hồ Chí Minh";
  
  // Fetch data in parallel using Promise.all to optimize page load speed
  const [orders, customers, branches, salesEmployees, contracts] = await Promise.all([
    prisma.order.findMany({
      where: (activeBranch && !isHQ) ? { branch: activeBranch } : {},
      include: { orderitem: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.findMany({ 
      select: { code: true, name: true, abbreviation: true } 
    }),
    prisma.branch.findMany({ 
      where: { 
        status: "ACTIVE",
        ...((activeBranch && !isHQ) ? { name: activeBranch } : {})
      }, 
      select: { name: true } 
    }),
    prisma.employee.findMany({
      where: { department: "Kinh doanh" },
      select: { fullName: true }
    }),
    prisma.contract.findMany({
      select: {
        id: true,
        contractNumber: true,
        attachments: true,
        thermometerQty: true
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <DeliveryPlanTable 
      initialOrders={JSON.parse(JSON.stringify(orders))} 
      customers={customers.map(c => c.code)}
      customersFull={JSON.parse(JSON.stringify(customers))}
      branches={branches.map(b => b.name)}
      salesEmployees={salesEmployees.map(e => e.fullName)}
      currentUser={session?.employeeName || "Unknown"}
      contracts={JSON.parse(JSON.stringify(contracts))}
      activeBranch={activeBranch || undefined}
    />
  );
}
