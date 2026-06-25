import { prisma } from "@/lib/db";
import ContractTable from "./ContractTable";
import { getSession } from "@/lib/session";
import { getUserModuleBranchFilter } from "@/lib/permissions";

export default async function HopDongPage() {
  const session = await getSession();
  const user = session?.userId
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;
  const userName = user?.employeeName || user?.username || "";

  const filter = user ? await getUserModuleBranchFilter(user.id, "KD_HOP_DONG", session?.activeBranch, {
    employeeInBranchField: "salesEmployee",
    employeeField: "salesEmployee"
  }) : { id: "NO_ACCESS" };

  const employeeFilter = user ? await getUserModuleBranchFilter(user.id, "KD_HOP_DONG", session?.activeBranch, {
    branchField: "branch",
    employeeField: "fullName"
  }) : { id: "NO_ACCESS" };
  
  const [contracts, customers, products, employees, banks] = await Promise.all([
    (prisma as any).contract.findMany({
      where: filter,
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
      where: employeeFilter,
      select: { id: true, fullName: true, department: true }
    }),
    prisma.bank.findMany({
      orderBy: { code: "asc" }
    }),
  ]);

  return (
    <ContractTable 
      initialContracts={JSON.parse(JSON.stringify(contracts))} 
      customers={JSON.parse(JSON.stringify(customers))}
      products={JSON.parse(JSON.stringify(products))}
      currentUser={session?.employeeName || "Unknown"}
      initialEmployees={JSON.parse(JSON.stringify(employees))}  
      banks={JSON.parse(JSON.stringify(banks))}
    />
  );
}

