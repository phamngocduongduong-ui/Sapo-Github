import { getSession } from "@/lib/session";
import { getBanks } from "./actions";
import BankTable from "./BankTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BankPage() {
  const banks = await getBanks();

  return (
    <div style={{ width: "100%" }}>
      <BankTable initialBanks={banks as any} />
    </div>
  );
}
