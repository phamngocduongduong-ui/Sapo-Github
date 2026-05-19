import { prisma } from "@/lib/db";
import SecurityListView from "./SecurityListView";

export default async function SecurityListPage() {
  const registrations = await (prisma as any).securityregistration.findMany({
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
