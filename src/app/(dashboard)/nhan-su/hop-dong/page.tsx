import { prisma } from "@/lib/db";
import LaborContractTable from "./LaborContractTable";
import { getSession } from "@/lib/session";

export default async function LaborContractPage() {
  const session = await getSession();
  const userName = session?.employeeName || session?.username || "Admin";

  const contracts = await prisma.laborContract.findMany({
    orderBy: { createdAt: "desc" }
  });

  // Lấy danh sách nhân viên đang hoạt động
  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    select: { 
      fullName: true,
      position: true,
      department: true
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

  const salaryLevels = await prisma.salaryLevel.findMany({
    orderBy: { stt: "asc" }
  });

  return (
    <main className="main-content">
      <div className="page-header" style={{ marginBottom: "2rem" }}>
        <h1 className="page-title" style={{ marginBottom: "0.25rem" }}>
          📄 Quản lý Hợp đồng lao động
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
          Quản lý thông tin lương, phụ cấp và các loại hợp đồng lao động
        </p>
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <LaborContractTable 
          initialContracts={contracts as any} 
          employees={employees} 
          positions={positions} 
          departments={departments}
          approvers={approverList}
          currentUserName={userName}
          salaryLevels={salaryLevels}
        />
      </div>
    </main>
  );
}
