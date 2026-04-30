import { prisma } from "@/lib/db";
import PermissionAssignment from "./PermissionAssignment";

export default async function QuyenSuDungPage() {
  const categories = await prisma.permission.findMany({
    where: {
      status: "ACTIVE"
    },
    orderBy: {
      name: "asc"
    }
  });

  return (
    <main className="main-content" style={{ padding: "2rem", width: "100%" }}>
      <h1 className="page-title" style={{ marginBottom: "0.25rem" }}>
        🔐 Phân quyền theo Mục quyền
      </h1>
      <p style={{ color: "#888", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Thiết lập quyền truy cập cho từng nhóm quyền. Tài khoản thuộc nhóm nào sẽ thừa hưởng quyền đó.
      </p>

      <PermissionAssignment categories={categories} />
    </main>
  );
}
