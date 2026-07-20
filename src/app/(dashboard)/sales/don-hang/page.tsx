import { prisma } from "@/lib/db";
import OrderTable from "./OrderTable";
import { getSession } from "@/lib/session";
import { getUserModuleBranchFilter } from "@/lib/permissions";

async function getUserPosition(employeeName: string | null) {
  if (!employeeName) return "";

  // Check in transferpromotion table for the latest approved request
  const latestTransfer = await (prisma as any).transferpromotion.findFirst({
    where: {
      employeeName: employeeName,
      status: "Đã phê duyệt"
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (latestTransfer) {
    return latestTransfer.newPosition || "";
  }

  // Fallback to employee table
  const employee = await prisma.employee.findFirst({
    where: { fullName: employeeName }
  });

  return employee?.position || "";
}

export default async function DonHangPage() {
  const session = await getSession();
  const user = session?.userId
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;
  const position = await getUserPosition(user?.employeeName || null);
  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const isManager = isAdmin || user?.role?.includes("Trưởng phòng") || position.includes("Trưởng phòng") || position.includes("Giám đốc");
  const isStaff = !isManager;
  const userName = user?.employeeName || user?.username || "";

  const activeBranch = session?.activeBranch;

  let filter: any = { id: "NO_ACCESS" };
  if (user) {
    if (isManager) {
      // Trưởng phòng trở lên thấy toàn bộ đơn hàng
      filter = {};
    } else {
      // Nhân viên kinh doanh: thấy đơn hàng thuộc hợp đồng của mình (dù ai tạo)
      // hoặc đơn hàng mà họ là người phụ trách (employeeName)
      const userContracts = await prisma.contract.findMany({
        where: { salesEmployee: userName },
        select: { contractNumber: true }
      });
      const contractNumbers = userContracts.map(c => c.contractNumber);
      const contractConditions = contractNumbers.map(num => ({
        note: { contains: `Hợp đồng: ${num}` }
      }));

      filter = {
        OR: [
          { employeeName: userName },
          ...contractConditions
        ]
      };
    }
  }

  const orders = await prisma.order.findMany({
    where: filter,
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

  // Danh sách hợp đồng để chọn trong form:
  // - Trưởng phòng trở lên: thấy tất cả hợp đồng
  // - Nhân viên: chỉ thấy hợp đồng của mình
  let contractFilter: any = {};
  if (!isManager && user) {
    contractFilter = { salesEmployee: userName };
  }

  // Lấy danh sách hợp đồng để chọn trong biểu mẫu
  const contracts = await prisma.contract.findMany({
    where: contractFilter,
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
      isStaff={isStaff}
    />
  );
}
