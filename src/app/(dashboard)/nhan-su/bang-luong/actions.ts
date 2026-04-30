"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Hàm tính toán chi tiết lương cho 1 nhân viên
async function calculatePayrollItem(code: string, month: number, year: number) {
  const employee = await prisma.employee.findUnique({
    where: { employeeCode: code }
  });
  
  const fullName = employee?.fullName || "";
  if (!fullName) return null;

  // Lấy hợp đồng/đề xuất tăng lương mới nhất
  const contract = await prisma.laborContract.findFirst({
    where: { employeeName: fullName, status: "Đã phê duyệt" },
    orderBy: { updatedAt: "desc" }
  });

  const salaryIncrease = await prisma.salaryIncreaseRequest.findFirst({
    where: { employeeName: fullName, status: "Đã phê duyệt" },
    orderBy: { updatedAt: "desc" }
  });

  let salaryBase = 0;
  let attendanceAllowance = 0;
  let performanceAllowance = 0;
  let responsibilityAllowance = 0;
  let socialInsuranceBase = 0;

  if (contract && salaryIncrease) {
    if (contract.updatedAt > salaryIncrease.updatedAt) {
      salaryBase = contract.salaryBase;
      attendanceAllowance = contract.attendanceAllowance;
      performanceAllowance = contract.performanceAllowance;
      responsibilityAllowance = contract.responsibilityAllowance;
      socialInsuranceBase = contract.socialInsurance;
    } else {
      salaryBase = salaryIncrease.proposedSalary;
      attendanceAllowance = contract.attendanceAllowance;
      performanceAllowance = contract.performanceAllowance;
      responsibilityAllowance = contract.responsibilityAllowance;
      socialInsuranceBase = contract.socialInsurance;
    }
  } else if (contract) {
    salaryBase = contract.salaryBase;
    attendanceAllowance = contract.attendanceAllowance;
    performanceAllowance = contract.performanceAllowance;
    responsibilityAllowance = contract.responsibilityAllowance;
    socialInsuranceBase = contract.socialInsurance;
  } else if (salaryIncrease) {
    salaryBase = salaryIncrease.proposedSalary;
    attendanceAllowance = 0;
    performanceAllowance = 0;
    responsibilityAllowance = 0;
    socialInsuranceBase = 0;
  }

  if (salaryBase <= 0) return null;

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
    overtimePay: Math.round(overtimePay),
    socialInsuranceDeduction: Math.round(socialInsuranceDeduction)
  };
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


  const payroll = await prisma.payroll.create({
    data: { 
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
    if (!calcResult) {
      throw new Error(`Nhân viên ${code} chưa có thông tin lương được phê duyệt.`);
    }

    await prisma.payrollDetail.create({
      data: {
        payrollId: payroll.id,
        ...calcResult
      }
    });
  }

  revalidatePath("/nhan-su/bang-luong");
}

export async function updatePayroll(id: string, formData: FormData) {
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);
  const approver = formData.get("approver") as string;
  const note = formData.get("note") as string;

  await prisma.payroll.update({
    where: { id },
    data: { 
      month, 
      year, 
      approver: approver || "", 
      note 
    }
  });
  revalidatePath("/nhan-su/bang-luong");
}

export async function getPayrolls() {
  return await prisma.payroll.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { _count: { select: { details: true } } }
  });
}

export async function deletePayroll(id: string) {
  await prisma.payroll.delete({ where: { id } });
  revalidatePath("/nhan-su/bang-luong");
}

export async function getPayrollDetails(payrollId: string) {
  return await prisma.payrollDetail.findMany({ where: { payrollId } });
}

export async function updatePayrollDetail(id: string, data: any) {
  await prisma.payrollDetail.update({
    where: { id },
    data: {
      incomePerWorkday: parseFloat(data.incomePerWorkday),
      attendanceBonus: parseFloat(data.attendanceBonus),
      performanceBonus: parseFloat(data.performanceBonus),
      responsibilityBonus: parseFloat(data.responsibilityBonus || 0),
      overtimePay: parseFloat(data.overtimePay),
      socialInsuranceDeduction: parseFloat(data.socialInsuranceDeduction || 0)
    }
  });
  revalidatePath("/nhan-su/bang-luong");
}

export async function updatePayrollStatus(id: string, status: string) {
  await prisma.payroll.update({ where: { id }, data: { status } });
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
      data: {
        incomePerWorkday: calcResult.incomePerWorkday,
        attendanceBonus: calcResult.attendanceBonus,
        performanceBonus: calcResult.performanceBonus,
        responsibilityBonus: calcResult.responsibilityBonus,
        overtimePay: calcResult.overtimePay,
        socialInsuranceDeduction: calcResult.socialInsuranceDeduction
      }
    });
  }
}
