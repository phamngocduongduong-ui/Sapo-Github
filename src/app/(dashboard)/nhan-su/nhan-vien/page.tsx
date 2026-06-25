import { prisma } from "@/lib/db";
import EmployeeTable from "./EmployeeTable";
import { getSession } from "@/lib/session";
import { getUserModuleBranchFilter, getUserPermission } from "@/lib/permissions";

export default async function NhanVienPage() {
  const session = await getSession();
  const user = await prisma.user.findUnique({
    where: { id: session?.userId || "" }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const userBranches = user?.branch ? user.branch.split(",").map(b => b.trim()).filter(Boolean) : [];

  const filter = user ? await getUserModuleBranchFilter(user.id, "NS_NHAN_VIEN", session?.activeBranch, {
    branchField: "branch",
    creatorField: "creator",
    employeeField: "fullName"
  }) : { id: "NO_ACCESS" };

  const employees = await prisma.employee.findMany({
    where: filter,
    orderBy: { createdAt: "desc" }
  });



  const branches = await prisma.branch.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true }
  });

  const positions = await prisma.position.findMany({
    where: { status: "ACTIVE" },
    select: { name: true }
  });

  const departments = await prisma.department.findMany({
    where: { status: "ACTIVE" },
    select: { name: true }
  });


  const { allBranches } = user ? await getUserPermission(user.id, "NS_NHAN_VIEN") : { allBranches: false };

  return (
    <EmployeeTable 
      initialEmployees={employees as any} 
      branches={isAdmin || allBranches ? branches.map(b => b.name) : branches.map(b => b.name).filter(b => userBranches.includes(b))}
      activePositions={positions.map(p => p.name)}
      activeDepartments={departments.map(d => d.name)}
      currentUserName={user?.employeeName || user?.username || "Admin"}
    />
  );
}
