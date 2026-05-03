import { prisma } from "@/lib/db";
import PayrollTable from "./PayrollTable";
import { getSession } from "@/lib/session";

export default async function PayrollPage() {
  const session = await getSession();
  const user = await prisma.user.findUnique({
    where: { id: session?.userId || "" }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const userBranches = user?.branch ? user.branch.split(",").map(b => b.trim()).filter(Boolean) : [];
  const userName = user?.employeeName || user?.username || "User";

  const payrolls = await prisma.payroll.findMany({
    where: isAdmin ? {} : {
      branch: { in: userBranches }
    },

    orderBy: [
      { year: "desc" },
      { month: "desc" }
    ],
    include: {
      _count: {
        select: { payrolldetail: true }
      }
    }
  });


  const employees = await prisma.employee.findMany({
    where: { 
      status: "ACTIVE",
      ...(isAdmin ? {} : { branch: { in: user?.branch?.split(",").map(b => b.trim()).filter(Boolean) || [] } })
    },
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
          isAdmin={isAdmin}
        />
      </div>
    </main>
  );
}
