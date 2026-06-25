import { prisma } from "@/lib/db";
import ProductionOrderTable from "./ProductionOrderTable";
import { getSession } from "@/lib/session";

export default async function ProductionOrdersPage() {
  const session = await getSession();
  
  const activeBranch = session?.activeBranch;
  
  const orders = await prisma.order.findMany({
    where: activeBranch ? { branch: activeBranch } : {},
    include: { orderitem: true },
    orderBy: { createdAt: "desc" },
  });

  // Lấy danh sách khách hàng
  const customers = await prisma.customer.findMany({ select: { code: true, name: true, abbreviation: true } });
  
  // Lấy danh sách chi nhánh
  const branches = await prisma.branch.findMany({ 
    where: { 
      status: "ACTIVE",
      ...(activeBranch ? { name: activeBranch } : {})
    }, 
    select: { name: true } 
  });
 
  // Lấy danh sách nhân viên Kinh doanh để phục vụ hiển thị/lọc
  const salesEmployees = await prisma.employee.findMany({
    where: { department: "Kinh doanh" },
    select: { fullName: true }
  });
 
  // Lấy danh sách hợp đồng
  const contracts = await prisma.contract.findMany({
    include: { contractitem: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <ProductionOrderTable 
      initialOrders={JSON.parse(JSON.stringify(orders))} 
      customers={customers.map(c => c.code)}
      customersFull={JSON.parse(JSON.stringify(customers))}
      branches={branches.map(b => b.name)}
      salesEmployees={salesEmployees.map(e => e.fullName)}
      currentUser={session?.employeeName || "Unknown"}
      contracts={JSON.parse(JSON.stringify(contracts))}
    />
  );
}
