import { prisma } from "@/lib/db";
import UserTable from "./UserTable";
import { ensureDefaultAdmin } from "./actions";

export const dynamic = "force-dynamic";

export default async function TaiKhoanPage() {
  // Đảm bảo có tài khoản admin mặc định
  await ensureDefaultAdmin();

  const users = await (prisma as any).user.findMany({
    orderBy: { createdAt: 'desc' },
    include: { permission: true }
  });

  const activeEmployees = await prisma.employee.findMany({
    where: { status: { notIn: ["Nghỉ việc", "INACTIVE"] } },
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
    <UserTable 
      users={users.map(u => ({...u, createdAt: u.createdAt.toISOString()}))} 
      activeEmployees={activeEmployees.map(e => e.fullName)} 
      branches={branches.map(b => b.name)} 
      availablePermissions={availablePermissions}
    />
  );
}
