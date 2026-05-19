import { prisma } from "@/lib/db";
import CustomerTable from "./CustomerTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function KhachHangPage() {
  const [customers, countries] = await Promise.all([
    (prisma as any).$queryRawUnsafe(`
      SELECT id, code, name, abbreviation, classification, country, phone, email, address, status, createdAt, updatedAt 
      FROM customer 
      ORDER BY createdAt DESC
    `),
    (prisma as any).$queryRawUnsafe(`SELECT * FROM country ORDER BY name ASC`)
  ]);

  return (
    <main className="main-content" style={{ padding: "10px" }}>
      <CustomerTable initialCustomers={customers} countries={countries.map(c => c.name)} />
    </main>
  );
}

