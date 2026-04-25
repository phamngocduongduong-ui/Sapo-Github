import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import LeaveRequestTable from "./LeaveRequestTable";
import { redirect } from "next/navigation";

export default async function NghiPhepPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const requests = await prisma.leaveRequest.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="main-content" style={{ padding: "2rem", width: "100%" }}>
      <h1 className="page-title" style={{ marginBottom: "0.25rem" }}>
        🏖️ Quản lý Nghỉ phép
      </h1>
      <p style={{ color: "#888", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Đăng ký và theo dõi trạng thái nghỉ phép cá nhân
      </p>

      <div className="card" style={{ padding: "1.5rem" }}>
        <LeaveRequestTable initialRequests={requests} currentUserName={session.username} />
      </div>
    </main>
  );
}
