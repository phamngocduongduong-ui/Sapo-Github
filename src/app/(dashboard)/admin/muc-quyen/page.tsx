import { prisma } from "@/lib/db";
import PermissionTable from "./PermissionTable";

export default async function MucQuyenPage() {
  const permissions = await prisma.permission.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="main-content" style={{ padding: "2rem", width: "100%" }}>
      <h1 className="page-title" style={{ marginBottom: "0.25rem" }}>
        🛡️ Quản lý Mục quyền
      </h1>
      <p style={{ color: "#888", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Định nghĩa danh mục các quyền truy cập trong hệ thống
      </p>

      <div className="card" style={{ padding: "1.5rem" }}>
        <PermissionTable initialPermissions={permissions as any} />
      </div>
    </main>
  );
}
