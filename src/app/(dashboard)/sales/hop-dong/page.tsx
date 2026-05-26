import { prisma } from "@/lib/db";
import ContractTable from "./ContractTable";
import { getSession } from "@/lib/session";

export default async function HopDongPage() {
  const session = await getSession();
  const user = session?.userId
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;
  const isStaff = user?.role?.includes("Nhân viên") && user?.username !== "admin" && user?.role !== "Admin";
  const userName = user?.employeeName || user?.username || "";
  const whereClause = isStaff ? { salesEmployee: userName } : {};
  
  const [contracts, customers, products, employees] = await Promise.all([
    (prisma as any).contract.findMany({
      where: whereClause,
      include: { contractitem: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.findMany({
      select: { name: true, code: true, abbreviation: true }
    }),
    prisma.product.findMany({
      where: {
        status: "Hoạt động"
      },
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
    }),
    prisma.employee.findMany({
      select: { id: true, fullName: true, department: true }
    }),
  ]);

  return (
    <ContractTable 
      initialContracts={JSON.parse(JSON.stringify(contracts))} 
      customers={JSON.parse(JSON.stringify(customers))}
      products={JSON.parse(JSON.stringify(products))}
      currentUser={session?.employeeName || "Unknown"}
      initialEmployees={JSON.parse(JSON.stringify(employees))}  
    />
  );
}

