"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { generateNextContractNumber } from "../nhan-vien/actions";

export async function createLaborContract(formData: FormData) {
  const employeeName = formData.get("employeeName") as string;
  let contractNumber = formData.get("contractNumber") as string;
  const contractType = formData.get("contractType") as string;
  const contractDate = formData.get("contractDate") as string;
  const startDate = formData.get("startDate") as string;
  const durationMonths = parseInt(formData.get("durationMonths") as string || "0");
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

  if (!employeeName || !contractType || !contractDate || !startDate || !position || !department || !creator) {
    const missing = [];
    if (!employeeName) missing.push("Nhân viên");
    if (!contractType) missing.push("Loại hợp đồng");
    if (!contractDate) missing.push("Ngày hợp đồng");
    if (!startDate) missing.push("Ngày bắt đầu");
    if (!position) missing.push("Chức vụ");
    if (!department) missing.push("Bộ phận");
    if (!creator) missing.push("Người tạo");
    throw new Error(`Thiếu thông tin bắt buộc: ${missing.join(", ")}`);
  }

  // Auto-generate if missing
  if (!contractNumber) {
    contractNumber = await generateNextContractNumber(employeeName);
  }

  if (!contractNumber) {
    throw new Error(`Không thể tạo số hợp đồng cho nhân viên "${employeeName}". Vui lòng kiểm tra chi nhánh của nhân viên này trong danh sách nhân viên.`);
  }

  const existing = await prisma.laborContract.findUnique({
    where: { contractNumber }
  });
  if (existing) throw new Error("Số hợp đồng đã tồn tại.");

  const employee = await prisma.employee.findFirst({
    where: { fullName: employeeName }
  });

  const contract = await prisma.laborContract.create({
    data: {
      employeeName,
      contractNumber,
      contractType,
      contractDate: new Date(contractDate),
      startDate: new Date(startDate),
      durationMonths: durationMonths || null,
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

  const session = await getSession();
  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "LaborContract",
    recordId: contract.id,
    action: "CREATE",
    newData: contract,
    changedBy,
    changeDetail: `Tạo hợp đồng lao động mới: ${contractNumber}`
  });

  revalidatePath("/nhan-su/hop-dong");
}

export async function updateLaborContract(id: string, formData: FormData, status?: string) {
  const employeeName = formData.get("employeeName") as string;
  const contractType = formData.get("contractType") as string;
  const contractDate = formData.get("contractDate") as string;
  const startDate = formData.get("startDate") as string;
  const durationMonths = parseInt(formData.get("durationMonths") as string || "0");
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

  const session = await getSession();
  const oldContract = await prisma.laborContract.findUnique({ where: { id } });

  const employee = await prisma.employee.findFirst({
    where: { fullName: employeeName }
  });

  const updatedContract = await prisma.laborContract.update({
    where: { id },
    data: {
      employeeName,
      contractType,
      contractDate: new Date(contractDate),
      startDate: new Date(startDate),
      durationMonths: durationMonths || null,
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
      socialInsurance,
      status: status || undefined
    }
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "LaborContract",
    recordId: id,
    action: "UPDATE",
    oldData: oldContract,
    newData: updatedContract,
    changedBy,
    changeDetail: "Cập nhật thông tin hợp đồng lao động"
  });

  revalidatePath("/nhan-su/hop-dong");
}

export async function updateContractStatus(id: string, status: string) {
  const session = await getSession();
  const oldContract = await prisma.laborContract.findUnique({ where: { id } });

  await prisma.laborContract.update({
    where: { id },
    data: { status }
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Admin";

  await logAudit({
    tableName: "LaborContract",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldContract?.status },
    newData: { status },
    changedBy,
    changeDetail: `Chuyển trạng thái hợp đồng sang: ${status}`
  });
  revalidatePath("/nhan-su/hop-dong");
}

export async function bulkUpsertLaborContracts(dataList: any[]) {
  const session = await getSession();
  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const creator = user?.employeeName || user?.username || "Hệ thống";

  // Fetch all salary levels for lookup
  const salaryLevels = await prisma.salaryLevel.findMany();

  for (const item of dataList) {
    const { contractNumber, employeeName, ...rest } = item;
    
    const updateData: any = { employeeName, ...rest };
    if (updateData.contractDate) updateData.contractDate = new Date(updateData.contractDate);
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
    if (updateData.createdDate) updateData.createdDate = new Date(updateData.createdDate);

    // Auto-fill from SalaryLevel if available
    if (updateData.salaryLevel) {
      const level = salaryLevels.find(l => l.levelCode === updateData.salaryLevel);
      if (level) {
        updateData.salaryBase = level.baseSalary;
        updateData.attendanceAllowance = level.attendanceBonus;
        updateData.performanceAllowance = level.performanceBonus;
        updateData.responsibilityAllowance = level.responsibilityBonus;
      }
    }

    // Parse numeric fields
    const numericFields = ["salaryBase", "attendanceAllowance", "performanceAllowance", "responsibilityAllowance", "attractionAllowance", "positionAllowance", "otherAllowance", "socialInsurance"];
    numericFields.forEach(f => {
      if (item[f] !== undefined) {
        updateData[f] = parseFloat(item[f]) || 0;
      } else if (updateData[f] === undefined) {
        updateData[f] = 0;
      }
    });

    // Try to find existing contract by number or by (employeeName + contractType)
    let existing;
    if (contractNumber) {
      existing = await prisma.laborContract.findUnique({ where: { contractNumber } });
    } else {
      existing = await prisma.laborContract.findFirst({
        where: { employeeName, contractType: contractType || "" }
      });
    }

    if (existing) {
      await prisma.laborContract.update({
        where: { id: existing.id },
        data: updateData
      });
    } else {
      // Generate new number if missing
      const finalNo = contractNumber || (await generateNextContractNumber(employeeName));
      await prisma.laborContract.create({
        data: {
          contractNumber: finalNo,
          ...updateData,
          status: "Tạo mới",
          creator
        }
      });
    }
  }
  revalidatePath("/nhan-su/hop-dong");
}
