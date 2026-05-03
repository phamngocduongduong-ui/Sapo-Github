import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import PayrollLookupClient from "./PayrollLookupClient";

export default async function PayrollLookupPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });
  const employeeName = user?.employeeName || user?.username || "";

  // Tìm thông tin nhân viên
  const employee = await prisma.employee.findFirst({
    where: { fullName: employeeName }
  });

  if (!employee) {
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
        <h3>Thông báo</h3>
        <p>Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên trong hệ thống. Vui lòng liên hệ quản trị viên.</p>
      </div>
    );
  }

  // Lấy lịch sử lương của nhân viên này
  const history = await (prisma as any).payrolldetail.findMany({
    where: { employeeCode: employee.employeeCode },
    include: {
      payroll: {
        select: {
          month: true,
          year: true,
          status: true
        }
      }
    },
    orderBy: [
      { payroll: { year: "desc" } },
      { payroll: { month: "desc" } }
    ]
  });

  const employeeInfo = {
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    position: employee.position,
    department: employee.department,
    workplace: employee.workplace
  };

  return (
    <div className="p-6">
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700 }}>Tra cứu lương cá nhân</h1>
        <p style={{ color: "#64748b" }}>Xem chi tiết thu nhập hàng tháng và lịch sử lương của bạn.</p>
      </div>
      
      <PayrollLookupClient 
        initialInfo={employeeInfo} 
        allHistory={history as any} 
      />
    </div>
  );
}
