"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

// Hàm tính toán chi tiết lương cho 1 nhân viên
async function calculatePayrollItem(code: string, month: number, year: number) {
  const employee = await prisma.employee.findUnique({
    where: { employeeCode: code }
  });
  
  const fullName = employee?.fullName || "";
  if (!fullName) return null;

  // Lấy hợp đồng đã phê duyệt
  const contract = await prisma.laborContract.findFirst({
    where: { employeeName: fullName, status: "Đã phê duyệt" },
    orderBy: { updatedAt: "desc" }
  });

  // Lấy thay đổi lương được phê duyệt gần nhất và có hiệu lực (<= tháng/năm bảng lương)
  const salaryChange = await prisma.salaryChange.findFirst({
    where: { 
      employeeName: fullName, 
      status: "Đã phê duyệt",
      OR: [
        { effectiveYear: { lt: year } },
        { effectiveYear: year, effectiveMonth: { lte: month } }
      ]
    },
    orderBy: [
      { effectiveYear: "desc" },
      { effectiveMonth: "desc" }
    ]
  });

  let activeLevelCode = "";
  let source: "change" | "contract" | null = null;

  if (salaryChange) {
    activeLevelCode = salaryChange.proposedSalaryLevel;
    source = "change";
  } else if (contract) {
    activeLevelCode = contract.salaryLevel || "";
    source = "contract";
  }

  let salaryBase = 0;
  let attendanceAllowance = 0;
  let performanceAllowance = 0;
  let responsibilityAllowance = 0;
  let attractionAllowance = 0;
  let otherAllowance = 0;
  let socialInsuranceBase = 0;

  // 1. Lấy dữ liệu từ bảng SalaryLevel (Ưu tiên cao nhất cho mọi nguồn)
  if (activeLevelCode) {
    const level = await prisma.salaryLevel.findUnique({
      where: { levelCode: activeLevelCode }
    });
    if (level) {
      salaryBase = level.baseSalary;
      attendanceAllowance = level.attendanceBonus;
      performanceAllowance = level.performanceBonus;
      responsibilityAllowance = level.responsibilityBonus;
      // Chỉ lấy Attraction và Other từ bảng SalaryLevel nếu nguồn là từ Tăng/Giảm lương
      // Vì trong hợp đồng, 2 trường này là người dùng tự nhập tay
      if (source === "change") {
        attractionAllowance = level.attractionBonus;
        otherAllowance = level.otherBonus;
      }
    }
  }

  // 2. Nếu nguồn là Hợp đồng lao động, lấy Attraction và Other từ chính bản ghi hợp đồng (vì nhập tay)
  if (source === "contract" && contract) {
    attractionAllowance = contract.attractionAllowance;
    otherAllowance = contract.otherAllowance;
  }

  // 3. Fallback: Nếu vẫn chưa có lương cơ bản (ví dụ không tìm thấy Level), lấy từ hợp đồng
  if (salaryBase === 0 && contract) {
    salaryBase = contract.salaryBase;
    attendanceAllowance = contract.attendanceAllowance;
    performanceAllowance = contract.performanceAllowance;
    responsibilityAllowance = contract.responsibilityAllowance;
    // Nếu source là change, có thể Attraction vẫn là 0 nếu Level không có, nhưng user muốn lấy từ đâu?
    // Thường là lấy từ hợp đồng cũ nếu change không định nghĩa lại.
    if (attractionAllowance === 0) attractionAllowance = contract.attractionAllowance;
    if (otherAllowance === 0) otherAllowance = contract.otherAllowance;
    socialInsuranceBase = contract.socialInsurance;
  } else if (contract) {
    // Luôn lấy mức đóng BHXH từ hợp đồng chính thức
    socialInsuranceBase = contract.socialInsurance;
  }

  if (salaryBase <= 0) {
    return {
      employeeCode: code,
      employeeName: fullName,
      incomePerWorkday: 0,
      attendanceBonus: 0,
      performanceBonus: 0,
      responsibilityBonus: 0,
      attractionBonus: 0,
      otherBonus: 0,
      overtimePay: 0,
      socialInsuranceDeduction: 0
    };
  }

  // Lấy dữ liệu chấm công
  const attendance = await prisma.attendance.findUnique({
    where: { employeeCode_month_year: { employeeCode: code, month, year } }
  });

  const unpaidDays = attendance?.unpaidLeaveDays || 0;
  const paidDays = attendance?.paidLeaveDays || 0;

  // 1. Thu nhập ngày công
  const WORKDAY_COEFFICIENT = 26;
  const income = salaryBase - (salaryBase / WORKDAY_COEFFICIENT * unpaidDays);

  // 2. Chuyên cần
  const violatedDays = unpaidDays + (paidDays > 3 ? paidDays - 3 : 0);
  let ratio = 1;
  if (violatedDays === 3) ratio = 0.8;
  else if (violatedDays === 4) ratio = 0.5;
  else if (violatedDays === 5) ratio = 0.3;
  else if (violatedDays > 5) ratio = 0;

  const attendanceBonus = attendanceAllowance * ratio;

  // 3. Hiệu quả
  const performanceBonus = performanceAllowance;

  // 4. Trách nhiệm
  const responsibilityBonus = responsibilityAllowance;

  // 4b. Thu hút
  const attractionBonus = attractionAllowance;

  // 4c. Hỗ trợ khác
  const otherBonus = otherAllowance;

  // 5. Làm thêm giờ
  const workplace = (employee?.workplace || "").toLowerCase();
  const isDakLak = workplace.includes("đắk lắk") || workplace.includes("dak lak");
  const isSouth = workplace.includes("đồng tháp") || workplace.includes("hồ chí minh") || workplace.includes("hcm");

  let sunRate = 1;
  let holRate = 1;
  let weekRate = 1;

  if (isDakLak) {
    sunRate = 1.3;
    holRate = 2.0; 
    weekRate = 1.3;
  } else if (isSouth) {
    sunRate = 2.0;
    holRate = 3.0;
    weekRate = 1.5;
  }

  const OVERTIME_BASE = 4100000;
  const hourlyRate = OVERTIME_BASE / WORKDAY_COEFFICIENT / 8;
  const sundayOT = attendance?.sundayOvertimeHours || 0;
  const holidayOT = attendance?.holidayOvertimeHours || 0;
  const weekdayOT = attendance?.weekdayOvertimeHours || 0;

  const overtimePay = hourlyRate * (sundayOT * sunRate + holidayOT * holRate + weekdayOT * weekRate);

  // 6. BHXH (10.5% mức đóng BHXH)
  const socialInsuranceDeduction = socialInsuranceBase * 0.105;

  return {
    employeeCode: code,
    employeeName: fullName,
    incomePerWorkday: Math.max(0, Math.round(income)),
    attendanceBonus: Math.round(attendanceBonus),
    performanceBonus: Math.round(performanceBonus),
    responsibilityBonus: Math.round(responsibilityBonus),
    attractionBonus: Math.round(attractionBonus),
    otherBonus: Math.round(otherBonus),
    overtimePay: Math.round(overtimePay),
    socialInsuranceDeduction: Math.round(socialInsuranceDeduction)
  };
}

async function generateNextPayrollCode() {
  const all = await prisma.payroll.findMany({
    select: { payrollCode: true }
  });
  const nums = all
    .map(r => r.payrollCode ? parseInt(r.payrollCode.substring(2)) : 0)
    .filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `BL${(max + 1).toString().padStart(4, "0")}`;
}

export async function createPayroll(formData: FormData, selectedEmployeeCodes: string[]) {
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);
  const creator = formData.get("creator") as string;
  const approver = formData.get("approver") as string;
  const note = formData.get("note") as string;

  if (!month || !year || !creator) {
    throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc (*).");
  }

  const existing = await prisma.payroll.findUnique({
    where: { month_year: { month, year } }
  });
  if (existing) throw new Error(`Bảng lương tháng ${month}/${year} đã tồn tại.`);

  // Lấy chi nhánh của nhân viên đầu tiên để gán cho bảng lương
  let branch = "";
  if (selectedEmployeeCodes.length > 0) {
    const firstEmp = await prisma.employee.findUnique({
      where: { employeeCode: selectedEmployeeCodes[0] }
    });
    branch = firstEmp?.branch || "";
  }

  const payrollCode = await generateNextPayrollCode();

  const payroll = await prisma.payroll.create({
    data: { 
      payrollCode,
      month, 
      year, 
      branch, 
      creator, 
      approver: approver || "", 
      note: note || "", 
      status: "Tạo mới" 
    }
  });

  for (const code of selectedEmployeeCodes) {
    const calcResult = await calculatePayrollItem(code, month, year);
    if (calcResult) {
      await prisma.payrollDetail.create({
        data: { payrollId: payroll.id, ...calcResult }
      });
    }
  }

  const session = await getSession();
  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "Payroll",
    recordId: payroll.id,
    action: "CREATE",
    newData: payroll,
    changedBy,
    changeDetail: `Tạo bảng lương tháng ${month}/${year}`
  });

  revalidatePath("/nhan-su/bang-luong");
}

export async function updatePayroll(id: string, formData: FormData, selectedEmployeeCodes: string[]) {
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);
  const approver = formData.get("approver") as string;
  const note = formData.get("note") as string;

  const session = await getSession();
  const oldPayroll = await prisma.payroll.findUnique({ where: { id }, include: { details: true } });

  await prisma.payroll.update({
    where: { id },
    data: { 
      month, 
      year, 
      approver: approver || "", 
      note 
    }
  });

  // Đồng bộ danh sách nhân viên
  const currentDetails = await prisma.payrollDetail.findMany({ where: { payrollId: id } });
  const currentCodes = currentDetails.map(d => d.employeeCode);

  // Xóa bớt
  const codesToRemove = currentCodes.filter(c => !selectedEmployeeCodes.includes(c));
  if (codesToRemove.length > 0) {
    await prisma.payrollDetail.deleteMany({
      where: { payrollId: id, employeeCode: { in: codesToRemove } }
    });
  }

  // Thêm mới
  const codesToAdd = selectedEmployeeCodes.filter(c => !currentCodes.includes(c));
  for (const code of codesToAdd) {
    const calcResult = await calculatePayrollItem(code, month, year);
    if (calcResult) {
      await prisma.payrollDetail.create({
        data: { payrollId: id, ...calcResult }
      });
    }
  }

  const updatedPayroll = await prisma.payroll.findUnique({ where: { id }, include: { details: true } });
  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "Payroll",
    recordId: id,
    action: "UPDATE",
    oldData: oldPayroll,
    newData: updatedPayroll,
    changedBy,
    changeDetail: `Cập nhật bảng lương tháng ${month}/${year}`
  });

  revalidatePath("/nhan-su/bang-luong");
}

export async function deletePayroll(id: string) {
  await prisma.payroll.delete({ where: { id } });
  revalidatePath("/nhan-su/bang-luong");
}

export async function getPayrollDetails(payrollId: string) {
  return await prisma.payrollDetail.findMany({ where: { payrollId } });
}

// Hàm mới để làm mới toàn bộ dữ liệu bảng lương
export async function refreshAllPayrollDetails(payrollId: string) {
  const payroll = await prisma.payroll.findUnique({ where: { id: payrollId } });
  if (!payroll) throw new Error("Không tìm thấy bảng lương.");

  const details = await prisma.payrollDetail.findMany({ where: { payrollId } });
  
  for (const detail of details) {
    const calcResult = await calculatePayrollItem(detail.employeeCode, payroll.month, payroll.year);
    if (calcResult) {
      await prisma.payrollDetail.update({
        where: { id: detail.id },
        data: calcResult
      });
    }
  }
  
  revalidatePath("/nhan-su/bang-luong");
  return await prisma.payrollDetail.findMany({ where: { payrollId } });
}

export async function updatePayrollDetail(id: string, data: any) {
  const session = await getSession();
  const oldDetail = await prisma.payrollDetail.findUnique({ where: { id } });

  const updatedDetail = await prisma.payrollDetail.update({
    where: { id },
    data: {
      incomePerWorkday: parseFloat(data.incomePerWorkday),
      attendanceBonus: parseFloat(data.attendanceBonus),
      performanceBonus: parseFloat(data.performanceBonus),
      responsibilityBonus: parseFloat(data.responsibilityBonus || 0),
      attractionBonus: parseFloat(data.attractionBonus || 0),
      otherBonus: parseFloat(data.otherBonus || 0),
      overtimePay: parseFloat(data.overtimePay),
      socialInsuranceDeduction: parseFloat(data.socialInsuranceDeduction || 0)
    }
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "PayrollDetail",
    recordId: id,
    action: "UPDATE",
    oldData: oldDetail,
    newData: updatedDetail,
    changedBy,
    changeDetail: `Cập nhật chi tiết lương của nhân viên: ${updatedDetail.employeeName}`
  });

  revalidatePath("/nhan-su/bang-luong");
}

export async function updatePayrollStatus(id: string, status: string) {
  const session = await getSession();
  const oldPayroll = await prisma.payroll.findUnique({ where: { id } });

  await prisma.payroll.update({ where: { id }, data: { status } });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Admin";

  await logAudit({
    tableName: "Payroll",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldPayroll?.status },
    newData: { status },
    changedBy,
    changeDetail: `Chuyển trạng thái bảng lương tháng ${oldPayroll?.month}/${oldPayroll?.year} sang: ${status}`
  });
  revalidatePath("/nhan-su/bang-luong");
}

export async function syncPayrollWithAttendance(employeeCode: string, month: number, year: number) {
  const payroll = await prisma.payroll.findUnique({
    where: { month_year: { month, year } }
  });

  if (!payroll) return;

  const detail = await prisma.payrollDetail.findFirst({
    where: { payrollId: payroll.id, employeeCode }
  });

  if (!detail) return;

  const calcResult = await calculatePayrollItem(employeeCode, month, year);
  if (calcResult) {
    await prisma.payrollDetail.update({
      where: { id: detail.id },
      data: calcResult
    });
  }
}

export async function getEmployeeEligibility(employeeCodes: string[], month: number, year: number) {
  const eligibility: Record<string, { hasContract: boolean, hasAttendance: boolean }> = {};
  
  for (const code of employeeCodes) {
    const employee = await prisma.employee.findUnique({
      where: { employeeCode: code }
    });
    
    if (!employee) continue;

    // Check for approved contract
    const contract = await prisma.laborContract.findFirst({
      where: { employeeName: employee.fullName, status: "Đã phê duyệt" }
    });

    // Check for attendance record for specific month/year
    const attendance = await prisma.attendance.findUnique({
      where: { employeeCode_month_year: { employeeCode: code, month, year } }
    });

    eligibility[code] = {
      hasContract: !!contract,
      hasAttendance: !!attendance
    };
  }
  
  return eligibility;
}
