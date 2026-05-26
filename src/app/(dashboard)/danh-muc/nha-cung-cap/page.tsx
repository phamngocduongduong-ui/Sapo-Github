import { prisma } from "@/lib/db";
import SupplierTable from "./SupplierTable";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NhaCungCapPage() {
  const session = await getSession();
  const user = await prisma.user.findUnique({
    where: { id: session?.userId || "" }
  });
  const isAdmin = user?.username === "admin" || user?.role === "Admin";

  const suppliers = await (prisma as any).supplier.findMany({
    orderBy: { code: "asc" }
  });

  // Map nulls to undefined or default properties for safety in Client Components
  const mappedSuppliers = suppliers.map((s: any) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    taxCode: s.taxCode || "",
    phone: s.phone || "",
    email: s.email || "",
    address: s.address || "",
    debtPolicy: s.debtPolicy || "",
    debtDays: s.debtDays || 0,
    status: s.status || "Hoạt động",
    bankAccountInfo: s.bankAccountInfo || ""
  }));

  return (
    <SupplierTable initialSuppliers={mappedSuppliers} isAdmin={isAdmin} />
  );
}
