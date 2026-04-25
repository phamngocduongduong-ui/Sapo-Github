import { prisma } from "@/lib/db";
import AdminTable from "./AdminTable";
import { ensureDefaultAdmin } from "./actions";

export default async function AdminPage() {
  // Đảm bảo có tài khoản admin mặc định
  await ensureDefaultAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
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

  return (
    <main className="main-content" style={{ padding: '2rem', width: '100%' }}>
      <h1 className="page-title">🛡️ Quản lý Tài khoản</h1>
      <div className="card" style={{ padding: '1.5rem' }}>
        <AdminTable 
          users={users.map(u => ({...u, createdAt: u.createdAt.toISOString()}))} 
          activeEmployees={activeEmployees.map(e => e.fullName)} 
          branches={branches.map(b => b.name)} 
        />
      </div>
    </main>
  );
}
