import { prisma } from "@/lib/db";
import CountryClient from "./CountryClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function QuocGiaPage() {
  const countries = await (prisma as any).$queryRawUnsafe(`
    SELECT * FROM country ORDER BY code ASC
  `);

  return (
    <div style={{ width: "100%" }}>
      <CountryClient initialCountries={countries} />
    </div>
  );
}
