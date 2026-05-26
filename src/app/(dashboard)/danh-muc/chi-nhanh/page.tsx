import { prisma } from "@/lib/db";
import BranchTable from "./BranchTable";

export default async function ChiNhanhPage() {
  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div style={{ width: "100%" }}>
      <BranchTable initialBranches={branches} />
    </div>
  );
}
