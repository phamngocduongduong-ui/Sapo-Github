import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import SecurityListView from "./SecurityListView";

export default async function SecurityListPage() {
  const session = await getSession();
  const activeBranch = session?.activeBranch;

  const registrations = await (prisma as any).securityregistration.findMany({
    where: activeBranch ? { branch: activeBranch } : {},
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      height: "100vh",
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
      backgroundColor: "#f8fafc",
      padding: "20px 10px"
    }}>
      <div style={{ width: "100%", maxWidth: "100%", padding: "0" }}>
        <SecurityListView initialData={JSON.parse(JSON.stringify(registrations))} />
      </div>
    </div>
  );
}
