import { prisma } from "@/lib/db";
import OrderTable from "./OrderTable";
import { getSession } from "@/lib/session";

export default async function DonHangPage() {
  const session = await getSession();
  const user = session?.userId
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;
  const isStaff = user?.role?.includes("Nhân viên") && user?.username !== "admin" && user?.role !== "Admin";
  const userName = user?.employeeName || user?.username || "";

  const orders = await prisma.order.findMany({
    where: isStaff ? { employeeName: userName } : {},
    include: { orderitem: true },
    orderBy: { createdAt: "desc" },
  });

  // Lấy danh sách khách hàng để chọn trong form
  const customers = await prisma.customer.findMany({ select: { code: true, name: true, abbreviation: true } });
  
  // Lấy danh sách chi nhánh để chọn trong form
  const branches = await prisma.branch.findMany({
    where: {
      status: "ACTIVE",
      code: { not: "HCM" },
    },
    select: { name: true },
  });

  // Lấy danh sách nhân viên bộ phận Kinh doanh để phục vụ bộ lọc
  const salesEmployees = await prisma.employee.findMany({
    where: { department: "Kinh doanh" },
    select: { fullName: true }
  });

  // Lấy danh sách hợp đồng để chọn trong biểu mẫu
  const contracts = await prisma.contract.findMany({
    where: isStaff ? { salesEmployee: userName } : {},
    include: { contractitem: true },
    orderBy: { createdAt: "desc" }
  });

  // Lấy danh sách sản phẩm để ánh xạ tên tiếng Việt và điền quy cách
  const products = await prisma.product.findMany({
    select: {
      code: true,
      name: true,
      englishName: true,
      packaging: true,
      unit: {
        select: {
          name: true
        }
      }
    }
  });

  return (
    <OrderTable 
      initialOrders={JSON.parse(JSON.stringify(orders))} 
      customers={customers.map(c => c.code)}
      branches={branches.map(b => b.name)}
      salesEmployees={salesEmployees.map(e => e.fullName)}
      currentUser={session?.employeeName || "Unknown"}
      contracts={JSON.parse(JSON.stringify(contracts))}
      customersFull={JSON.parse(JSON.stringify(customers))}
      products={JSON.parse(JSON.stringify(products))}
    />
  );
}
