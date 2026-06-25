import { prisma } from "@/lib/db";
import LaborContractTable from "./LaborContractTable";
import { getSession } from "@/lib/session";
import { getUserModuleBranchFilter } from "@/lib/permissions";

export default async function LaborContractPage() {
  const session = await getSession();
  const user = await prisma.user.findUnique({
    where: { id: session?.userId || "" }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const userBranches = user?.branch ? user.branch.split(",").map(b => b.trim()).filter(Boolean) : [];
  const userName = user?.employeeName || user?.username || "User";

  const filter = user ? await getUserModuleBranchFilter(user.id, "NS_HOP_DONG", session?.activeBranch, {
    branchField: "branch",
    creatorField: "creator",
    employeeField: "employeeName"
  }) : { id: "NO_ACCESS" };

  // Lọc hợp đồng
  const contracts = await (prisma as any).laborcontract.findMany({
    where: filter,
    orderBy: { createdAt: "desc" }
  });

  const employeeFilter = user ? await getUserModuleBranchFilter(user.id, "NS_HOP_DONG", session?.activeBranch, {
    branchField: "branch",
    creatorField: "creator",
    employeeField: "fullName"
  }) : { id: "NO_ACCESS" };

  // Lấy danh sách nhân viên đang hoạt động thuộc chi nhánh được phép
  const employees = await prisma.employee.findMany({
    where: { 
      status: { notIn: ["Nghỉ việc", "INACTIVE"] },
      ...employeeFilter
    },
    select: { 
      fullName: true,
      position: true,
      department: true,
      branch: true
    }
  });


  // Lọc người phê duyệt từ danh sách nhân viên phía trên
  // Thực hiện lọc ở phía JS để xử lý tốt tiếng Việt không phân biệt hoa thường
  const approverList = employees.filter(e => {
    const pos = (e.position || "").toLowerCase();
    const dept = (e.department || "").toLowerCase();
    
    const isDirector = pos.includes("giám đốc");
    const isHrManager = pos.includes("trưởng phòng") && dept.includes("nhân sự");
    
    return isDirector || isHrManager;
  });

  const positions = await prisma.position.findMany({
    where: { status: "ACTIVE" },
    select: { name: true }
  });

  const departments = await prisma.department.findMany({
    where: { status: "ACTIVE" },
    select: { name: true }
  });

  const salaryLevels = await (prisma as any).salarylevel.findMany({
    orderBy: { stt: "asc" }
  });

  return (
    <LaborContractTable 
      initialContracts={contracts as any} 
      employees={employees} 
      positions={positions} 
      departments={departments}
      approvers={approverList}
      currentUserName={userName}
      salaryLevels={salaryLevels}
      isAdmin={isAdmin}
    />
  );
}
