"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createLaborContract(formData: FormData) {
  const employeeName = formData.get("employeeName") as string;
  const contractNumber = formData.get("contractNumber") as string;
  const contractType = formData.get("contractType") as string;
  const contractDate = formData.get("contractDate") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const position = formData.get("position") as string;
  const department = formData.get("department") as string;
  const salaryLevel = formData.get("salaryLevel") as string;
  const creator = formData.get("creator") as string;
  const approver = formData.get("approver") as string;
  const note = formData.get("note") as string;
  const createdDate = formData.get("createdDate") as string;

  // Lương và phụ cấp
  const salaryBase = parseFloat(formData.get("salaryBase") as string || "0");
  const attendanceAllowance = parseFloat(formData.get("attendanceAllowance") as string || "0");
  const performanceAllowance = parseFloat(formData.get("performanceAllowance") as string || "0");
  const responsibilityAllowance = parseFloat(formData.get("responsibilityAllowance") as string || "0");
  const attractionAllowance = parseFloat(formData.get("attractionAllowance") as string || "0");
  const positionAllowance = parseFloat(formData.get("positionAllowance") as string || "0");
  const otherAllowance = parseFloat(formData.get("otherAllowance") as string || "0");
  const socialInsurance = parseFloat(formData.get("socialInsurance") as string || "0");

  if (!employeeName || !contractNumber || !contractType || !contractDate || !startDate || !position || !department || !creator) {
    throw new Error("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
  }

  const existing = await prisma.laborContract.findUnique({
    where: { contractNumber }
  });
  if (existing) throw new Error("Số hợp đồng đã tồn tại.");

  const employee = await prisma.employee.findFirst({
    where: { fullName: employeeName }
  });

  await prisma.laborContract.create({
    data: {
      employeeName,
      contractNumber,
      contractType,
      contractDate: new Date(contractDate),
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      position,
      department,
      salaryLevel: salaryLevel || "",
      creator,
      approver: approver || "",
      note: note || "",
      branch: employee?.branch || "",
      status: "Tạo mới",
      salaryBase,
      attendanceAllowance,
      performanceAllowance,
      responsibilityAllowance,
      attractionAllowance,
      positionAllowance,
      otherAllowance,
      socialInsurance,
      createdDate: createdDate ? new Date(createdDate) : new Date()
    }
  });

  revalidatePath("/nhan-su/hop-dong");
}

export async function updateLaborContract(id: string, formData: FormData) {
  const employeeName = formData.get("employeeName") as string;
  const contractType = formData.get("contractType") as string;
  const contractDate = formData.get("contractDate") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const position = formData.get("position") as string;
  const department = formData.get("department") as string;
  const salaryLevel = formData.get("salaryLevel") as string;
  const approver = formData.get("approver") as string;
  const note = formData.get("note") as string;
  
  // Lương và phụ cấp
  const salaryBase = parseFloat(formData.get("salaryBase") as string || "0");
  const attendanceAllowance = parseFloat(formData.get("attendanceAllowance") as string || "0");
  const performanceAllowance = parseFloat(formData.get("performanceAllowance") as string || "0");
  const responsibilityAllowance = parseFloat(formData.get("responsibilityAllowance") as string || "0");
  const attractionAllowance = parseFloat(formData.get("attractionAllowance") as string || "0");
  const positionAllowance = parseFloat(formData.get("positionAllowance") as string || "0");
  const otherAllowance = parseFloat(formData.get("otherAllowance") as string || "0");
  const socialInsurance = parseFloat(formData.get("socialInsurance") as string || "0");

  const employee = await prisma.employee.findFirst({
    where: { fullName: employeeName }
  });

  await prisma.laborContract.update({
    where: { id },
    data: {
      employeeName,
      contractType,
      contractDate: new Date(contractDate),
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      position,
      department,
      salaryLevel: salaryLevel || "",
      approver: approver || "",
      note: note || "",
      branch: employee?.branch || undefined,
      salaryBase,
      attendanceAllowance,
      performanceAllowance,
      responsibilityAllowance,
      attractionAllowance,
      positionAllowance,
      otherAllowance,
      socialInsurance
    }
  });

  revalidatePath("/nhan-su/hop-dong");
}

export async function updateContractStatus(id: string, status: string) {
  await prisma.laborContract.update({
    where: { id },
    data: { status }
  });
  revalidatePath("/nhan-su/hop-dong");
}
