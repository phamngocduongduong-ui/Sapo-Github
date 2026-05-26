import { prisma } from "@/lib/db";
import CustomerTable from "./CustomerTable";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function KhachHangPage() {
  const session = await getSession();
  const user = await prisma.user.findUnique({
    where: { id: session?.userId || "" }
  });
  const isAdmin = user?.username === "admin" || user?.role === "Admin";

  const [customers, countries] = await Promise.all([
    (prisma as any).$queryRawUnsafe(`
      SELECT id, code, name, abbreviation, classification, country, phone, email, address, representative, status, createdAt, updatedAt 
      FROM customer 
      ORDER BY code ASC
    `),
    (prisma as any).$queryRawUnsafe(`SELECT * FROM country ORDER BY name ASC`)
  ]);

  return (
    <CustomerTable initialCustomers={customers} countries={countries.map(c => c.name)} isAdmin={isAdmin} />
  );
}

