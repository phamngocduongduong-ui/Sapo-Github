import { prisma } from "@/lib/db";
import UserTable from "./UserTable";
import { ensureDefaultAdmin } from "./actions";

export default async function TaiKhoanPage() {
  // Đảm bảo có tài khoản admin mặc định
  await ensureDefaultAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: { permission: true }
  });

  const activeEmployees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    select: { fullName: true },
    orderBy: { fullName: "asc" }
  });

  const branches = await prisma.branch.findMany({
    where: { status: "ACTIVE" },
    select: { name: true },
    orderBy: { name: "asc" }
  });

  const availablePermissions = await prisma.permission.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });

  return (
    <main className="main-content" style={{ padding: '2rem', width: '100%' }}>
      <h1 className="page-title" style={{ marginBottom: "0.25rem" }}>🛡️ Quản lý Tài khoản</h1>
      <p style={{ color: "#888", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Danh sách các tài khoản đăng nhập và phân quyền hệ thống
      </p>
      
      <div className="card" style={{ padding: '1.5rem' }}>
        <UserTable 
          users={users.map(u => ({...u, createdAt: u.createdAt.toISOString()}))} 
          activeEmployees={activeEmployees.map(e => e.fullName)} 
          branches={branches.map(b => b.name)} 
          availablePermissions={availablePermissions}
        />
      </div>
    </main>
  );
}
