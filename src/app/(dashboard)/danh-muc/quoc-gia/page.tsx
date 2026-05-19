import { prisma } from "@/lib/db";
import CountryClient from "./CountryClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function QuocGiaPage() {
  const countries = await (prisma as any).$queryRawUnsafe(`
    SELECT * FROM country ORDER BY code ASC
  `);

  return (
    <main className="main-content" style={{ padding: "10px" }}>
      <CountryClient initialCountries={countries} />
    </main>
  );
}
