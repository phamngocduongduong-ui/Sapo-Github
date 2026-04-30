"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { syncPayrollWithAttendance } from "@/app/(dashboard)/nhan-su/bang-luong/actions";

export async function getAttendances() {
  return await prisma.attendance.findMany({
    orderBy: { createdAt: "desc" }
  });
}

export async function createAttendance(formData: FormData) {
  const employeeCode = formData.get("employeeCode") as string;
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);
  const annualLeaveDays = parseFloat(formData.get("annualLeaveDays") as string || "0");
  const paidLeaveDays = parseFloat(formData.get("paidLeaveDays") as string || "0");
  const unpaidLeaveDays = parseFloat(formData.get("unpaidLeaveDays") as string || "0");
  const sundayOvertimeHours = parseFloat(formData.get("sundayOvertimeHours") as string || "0");
  const holidayOvertimeHours = parseFloat(formData.get("holidayOvertimeHours") as string || "0");
  const weekdayOvertimeHours = parseFloat(formData.get("weekdayOvertimeHours") as string || "0");

  if (!employeeCode || !month || !year) {
    throw new Error("Mã nhân viên, tháng và năm là bắt buộc.");
  }

  // Tự động lấy thông tin nhân viên
  const employee = await prisma.employee.findUnique({
    where: { employeeCode }
  });

  const attendanceData = {
    employeeCode,
    employeeName: employee?.fullName || "Không xác định",
    gender: employee?.gender || "",
    department: employee?.department || "",
    annualLeaveDays,
    paidLeaveDays,
    unpaidLeaveDays,
    sundayOvertimeHours,
    holidayOvertimeHours,
    weekdayOvertimeHours,
    month,
    year,
    branch: employee?.branch || ""
  };

  await prisma.attendance.upsert({
    where: {
      employeeCode_month_year: {
        employeeCode,
        month,
        year
      }
    },
    update: attendanceData,
    create: attendanceData
  });

  // Tự động đồng bộ với bảng lương nếu có
  await syncPayrollWithAttendance(employeeCode, month, year);

  revalidatePath("/nhan-su/cham-cong");
}

export async function updateAttendance(id: string, formData: FormData) {
  const employeeCode = formData.get("employeeCode") as string;
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);
  const annualLeaveDays = parseFloat(formData.get("annualLeaveDays") as string || "0");
  const paidLeaveDays = parseFloat(formData.get("paidLeaveDays") as string || "0");
  const unpaidLeaveDays = parseFloat(formData.get("unpaidLeaveDays") as string || "0");
  const sundayOvertimeHours = parseFloat(formData.get("sundayOvertimeHours") as string || "0");
  const holidayOvertimeHours = parseFloat(formData.get("holidayOvertimeHours") as string || "0");
  const weekdayOvertimeHours = parseFloat(formData.get("weekdayOvertimeHours") as string || "0");

  // Tự động lấy thông tin nhân viên
  const employee = await prisma.employee.findUnique({
    where: { employeeCode }
  });

  await prisma.attendance.update({
    where: { id },
    data: {
      employeeCode,
      employeeName: employee?.fullName || "Không xác định",
      gender: employee?.gender || "",
      department: employee?.department || "",
      annualLeaveDays,
      paidLeaveDays,
      unpaidLeaveDays,
      sundayOvertimeHours,
      holidayOvertimeHours,
      weekdayOvertimeHours,
      month,
      year,
      branch: employee?.branch || ""
    }
  });

  // Tự động đồng bộ với bảng lương nếu có
  await syncPayrollWithAttendance(employeeCode, month, year);

  revalidatePath("/nhan-su/cham-cong");
}

export async function deleteAttendance(id: string) {
  await prisma.attendance.delete({
    where: { id }
  });
  revalidatePath("/nhan-su/cham-cong");
}

export async function checkExistingAttendances(data: any[]) {
  const existingRecords = [];
  for (const item of data) {
    const employeeCode = String(item["Mã nhân viên"] || "");
    const month = parseInt(item["Tháng"] || "0");
    const year = parseInt(item["Năm"] || "0");
    
    if (!employeeCode || !month || !year) continue;

    const existing = await prisma.attendance.findUnique({
      where: {
        employeeCode_month_year: {
          employeeCode,
          month,
          year
        }
      }
    });

    if (existing) {
      existingRecords.push({
        employeeCode,
        employeeName: existing.employeeName,
        month,
        year
      });
    }
  }
  return existingRecords;
}

export async function importAttendances(data: any[]) {
  const formattedData: any[] = [];
  
  for (const item of data) {
    const employeeCode = String(item["Mã nhân viên"] || "");
    const month = parseInt(item["Tháng"] || "0");
    const year = parseInt(item["Năm"] || "0");

    if (!employeeCode || !month || !year) continue;

    // Lấy thông tin nhân viên
    const employee = await prisma.employee.findUnique({
      where: { employeeCode }
    });

    formattedData.push({
      employeeCode,
      employeeName: employee?.fullName || "Không xác định",
      gender: employee?.gender || "",
      department: employee?.department || "",
      annualLeaveDays: parseFloat(item["Số ngày nghỉ phép năm"] || "0"),
      paidLeaveDays: parseFloat(item["Số ngày nghỉ việc hưởng lương"] || "0"),
      unpaidLeaveDays: parseFloat(item["Số ngày nghỉ việc không hưởng lương"] || "0"),
      sundayOvertimeHours: parseFloat(item["Số giờ làm thêm chủ nhật"] || "0"),
      holidayOvertimeHours: parseFloat(item["Số giờ làm thêm ngày lễ"] || "0"),
      weekdayOvertimeHours: parseFloat(item["Số giờ làm thêm ngày thường"] || "0"),
      month,
      year,
      branch: employee?.branch || ""
    });
  }

  // Use transaction to delete all and create new
  await prisma.$transaction(async (tx) => {
    await tx.attendance.deleteMany({});
    if (formattedData.length > 0) {
      await tx.attendance.createMany({
        data: formattedData
      });
    }
  });

  // Revalidate to update UI
  revalidatePath("/nhan-su/cham-cong");
}
