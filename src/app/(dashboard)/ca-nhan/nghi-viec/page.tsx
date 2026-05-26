import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ResignationTable from "./ResignationTable";
import { getResignations } from "./actions";

export default async function NghiViecPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { permission: { include: { permissiondetail: true } } }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const canApprove = isAdmin || ((user as any)?.permission?.some((p: any) => p.permissiondetail?.some((d: any) => d.moduleKey === "NS_APPROVE" && d.canAccess)) ?? false);


  const userBranches = user?.branch ? user.branch.split(",").map(b => b.trim()).filter(Boolean) : [];
  const currentUserName = user?.employeeName || user?.username || "";
  const currentUserBranch = user?.branch || "";

  const [resignations, employees] = await Promise.all([
    getResignations(isAdmin, userBranches),
    prisma.employee.findMany({
      where: { 
        status: "ACTIVE",
        branch: isAdmin ? undefined : { in: userBranches }
      },
      select: { id: true, fullName: true, employeeCode: true },
      orderBy: { fullName: "asc" }
    })
  ]);

  return (
    <ResignationTable 
      initialData={resignations} 
      employees={employees}
      canApprove={canApprove}
      currentUserName={currentUserName}
      currentUserBranch={currentUserBranch}
    />
  );
}
