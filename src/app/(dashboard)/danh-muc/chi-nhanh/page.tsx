import { prisma } from "@/lib/db";
import BranchTable from "./BranchTable";

export default async function ChiNhanhPage() {
  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="main-content" style={{ padding: "2rem", width: "100%" }}>
      <h1 className="page-title">📍 Danh mục Chi nhánh</h1>
      <div className="card" style={{ padding: "1.5rem" }}>
        <BranchTable initialBranches={branches} />
      </div>
    </main>
  );
}
