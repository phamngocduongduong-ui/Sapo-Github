import { prisma } from "@/lib/db";
import PayrollTable from "./PayrollTable";
import { getSession } from "@/lib/session";

export default async function PayrollPage() {
  const session = await getSession();
  const userName = session?.employeeName || session?.username || "Admin";

  const payrolls = await prisma.payroll.findMany({
    orderBy: [
      { year: "desc" },
      { month: "desc" }
    ],
    include: {
      _count: {
        select: { details: true }
      }
    }
  });

  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    select: { 
      employeeCode: true, 
      fullName: true, 
      position: true, 
      department: true 
    }
  });

  // Lọc người phê duyệt: Giám đốc hoặc (Trưởng phòng thuộc bộ phận Nhân sự)
  const approverList = employees.filter(e => {
    const pos = (e.position || "").toLowerCase();
    const dept = (e.department || "").toLowerCase();
    
    const isDirector = pos.includes("giám đốc");
    const isHrManager = pos.includes("trưởng phòng") && dept.includes("nhân sự");
    
    return isDirector || isHrManager;
  });

  return (
    <main className="main-content">
      <div className="page-header" style={{ marginBottom: "2rem" }}>
        <h1 className="page-title" style={{ marginBottom: "0.25rem" }}>
          💰 Quản lý Bảng lương
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
          Tạo và phê duyệt bảng lương tháng cho nhân viên theo quy định
        </p>
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <PayrollTable 
          initialPayrolls={payrolls as any}
          employees={employees}
          approvers={approverList}
          currentUserName={userName}
        />
      </div>
    </main>
  );
}
