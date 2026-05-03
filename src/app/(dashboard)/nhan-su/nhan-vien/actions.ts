"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function createEmployee(formData: FormData) {
  const employeeCode = formData.get("employeeCode") as string;
  const fullName = formData.get("fullName") as string;
  const position = formData.get("position") as string;
  const department = formData.get("department") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const gender = formData.get("gender") as string;
  const idCardNumber = formData.get("idCardNumber") as string;
  const idCardDate = formData.get("idCardDate") as string;
  const address = formData.get("address") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const educationLevel = formData.get("educationLevel") as string;
  const maritalStatus = formData.get("maritalStatus") as string;
  const workplace = formData.get("workplace") as string;
  const branch = formData.get("branch") as string;
  const salaryLevel = formData.get("salaryLevel") as string;

  if (!employeeCode || !fullName || !position || !department) {
    throw new Error("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
  }

  const existing = await prisma.employee.findUnique({
    where: { employeeCode }
  });
  if (existing) throw new Error("Mã nhân viên đã tồn tại.");

  const session = await getSession();
  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const creator = user?.employeeName || user?.username || "Hệ thống";

  const newEmp = await prisma.employee.create({
    data: {
      employeeCode,
      fullName,
      position,
      department,
      phone: phone || "",
      email: email || "",
      gender: gender || "",
      idCardNumber: idCardNumber || "",
      idCardDate: idCardDate ? new Date(idCardDate) : null,
      address: address || "",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: "ACTIVE", // ACTIVE = Hoạt động
      educationLevel: educationLevel || "",
      maritalStatus: maritalStatus || "Không",
      workplace: workplace || "",
      branch: branch || "",
      salaryLevel: salaryLevel || "",
      creator
    }
  });

  await logAudit({
    tableName: "Employee",
    recordId: newEmp.id,
    action: "CREATE",
    newData: newEmp,
    changedBy: creator,
    changeDetail: `Thêm nhân viên mới: ${fullName} (${employeeCode})`
  });


  revalidatePath("/nhan-su/nhan-vien");
}

export async function updateEmployee(id: string, formData: FormData) {
  const fullName = formData.get("fullName") as string;
  const position = formData.get("position") as string;
  const department = formData.get("department") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const status = formData.get("status") as string;
  const gender = formData.get("gender") as string;
  const idCardNumber = formData.get("idCardNumber") as string;
  const idCardDate = formData.get("idCardDate") as string;
  const address = formData.get("address") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const educationLevel = formData.get("educationLevel") as string;
  const maritalStatus = formData.get("maritalStatus") as string;
  const workplace = formData.get("workplace") as string;
  const branch = formData.get("branch") as string;
  const salaryLevel = formData.get("salaryLevel") as string;

  const oldEmployee = await prisma.employee.findUnique({
    where: { id }
  });
  if (!oldEmployee) throw new Error("Nhân viên không tồn tại.");

  const oldName = oldEmployee.fullName;

  const updatedEmployee = await prisma.employee.update({
    where: { id },
    data: {
      fullName,
      position,
      department,
      phone: phone || "",
      email: email || "",
      status: status || oldEmployee.status,
      gender: gender || "",
      idCardNumber: idCardNumber || "",
      idCardDate: idCardDate ? new Date(idCardDate) : null,
      address: address || "",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      educationLevel: educationLevel || "",
      maritalStatus: maritalStatus || "Không",
      workplace: workplace || "",
      branch: branch || "",
      salaryLevel: salaryLevel || "",
    }
  });

  const session = await getSession();
  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Admin";

  await logAudit({
    tableName: "Employee",
    recordId: id,
    action: "UPDATE",
    oldData: oldEmployee,
    newData: updatedEmployee,
    changedBy,
    changeDetail: `Cập nhật nhân viên: ${fullName}`
  });

  // Cập nhật ở các bảng khác
  if (oldName !== fullName) {
    // 1. User
    await (prisma as any).user.updateMany({
      where: { employeeName: oldName },
      data: { employeeName: fullName }
    });

    // 2. Nghỉ phép
    await (prisma as any).leaverequest.updateMany({
      where: { employeeName: oldName },
      data: { employeeName: fullName }
    });

    // 3. Hợp đồng lao động
    await (prisma as any).laborcontract.updateMany({
      where: { employeeName: oldName },
      data: { employeeName: fullName }
    });

    // 4. Tăng/Giảm lương
    await (prisma as any).salarychange.updateMany({
      where: { employeeName: oldName },
      data: { employeeName: fullName }
    });

    // 5. Thuyên chuyển / Bổ nhiệm
    await (prisma as any).transferpromotion.updateMany({
      where: { employeeName: oldName },
      data: { employeeName: fullName }
    });

    // 6. Nghỉ việc
    await (prisma as any).resignation.updateMany({
      where: { employeeName: oldName },
      data: { employeeName: fullName }
    });

    // 7. Kỷ luật / Vi phạm
    await (prisma as any).violation.updateMany({
      where: { employeeName: oldName },
      data: { employeeName: fullName }
    });

    // 8. Đơn hàng (Sale)
    await (prisma as any).order.updateMany({
      where: { employeeName: oldName },
      data: { employeeName: fullName }
    });

    // 9. Lệnh điều động (Purchasing)
    await (prisma as any).dispatchorder.updateMany({
      where: { employeeName: oldName },
      data: { employeeName: fullName }
    });

    // 10. Chi tiết bảng lương
    await (prisma as any).payrolldetail.updateMany({
      where: { employeeName: oldName },
      data: { employeeName: fullName }
    });
  }

  revalidatePath("/nhan-su/nhan-vien");
  revalidatePath("/admin");
  revalidatePath("/nhan-su/nghi-phep");
  revalidatePath("/nhan-su/hop-dong");
  revalidatePath("/nhan-su/tang-giam-luong");
  revalidatePath("/nhan-su/thuyen-chuyen-bo-nhiem");
  revalidatePath("/nhan-su/nghi-viec");
  revalidatePath("/nhan-su/ky-luat");
  revalidatePath("/sales");
  revalidatePath("/purchasing/dispatch");
  revalidatePath("/nhan-su/bang-luong");
}

export async function generateNextContractNumber(employeeName: string) {
  if (!employeeName) return "";
  const employee = await prisma.employee.findFirst({
    where: { fullName: employeeName }
  });
  
  if (!employee || !employee.branch) return "";
  
  const branch = await (prisma as any).branch.findFirst({ where: { name: employee.branch } });
  if (!branch) return "";
  
  const contracts = await (prisma as any).laborcontract.findMany({
    where: { branch: employee.branch },
    select: { contractNumber: true }
  });
  
  const nums = contracts
    .map(c => parseInt(c.contractNumber.split("/")[0]))
    .filter(n => !isNaN(n));
    
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  const seq = (max + 1).toString().padStart(3, '0');
  
  return `${seq}/${branch.code}`;
}


export async function updateEmployeeStatus(id: string, status: string) {
  const session = await getSession();
  const oldEmployee = await prisma.employee.findUnique({ where: { id } });

  const updatedEmployee = await prisma.employee.update({
    where: { id },
    data: { status }
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Admin";

  await logAudit({
    tableName: "Employee",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldEmployee?.status },
    newData: { status },
    changedBy,
    changeDetail: `Thay đổi trạng thái nhân viên sang: ${status === "ACTIVE" ? "Hoạt động" : "Ngưng hoạt động"}`
  });

  revalidatePath("/nhan-su/nhan-vien");
}

export async function bulkUpsertEmployees(dataList: any[]) {
  const session = await getSession();
  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const creator = user?.employeeName || user?.username || "Hệ thống";

  for (const item of dataList) {
    const { employeeCode, fullName, branch, ...rest } = item;
    
    // Convert dates if any
    const updateData: any = { fullName, branch, ...rest };
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
    if (updateData.idCardDate) updateData.idCardDate = new Date(updateData.idCardDate);

    // Try to find existing employee by code or by (name + branch)
    let existing;
    if (employeeCode) {
      existing = await prisma.employee.findUnique({ where: { employeeCode } });
    } else {
      existing = await prisma.employee.findFirst({
        where: { fullName, branch: branch || "" }
      });
    }

    if (existing) {
      await prisma.employee.update({
        where: { id: existing.id },
        data: updateData
      });
    } else {
      // Generate new code if missing
      const finalCode = employeeCode || (await generateNextEmployeeCode(branch));
      await prisma.employee.create({
        data: {
          employeeCode: finalCode,
          ...updateData,
          status: "ACTIVE",
          creator
        }
      });
    }
  }
  revalidatePath("/nhan-su/nhan-vien");
}

export async function generateNextEmployeeCode(branchName: string) {
  if (!branchName) return "";
  const branch = await prisma.branch.findFirst({ where: { name: branchName } });
  if (!branch) return "";
  
  const employees = await prisma.employee.findMany({
    where: { branch: branchName },
    select: { employeeCode: true }
  });
  
  const nums = employees
    .map(e => parseInt(e.employeeCode.split(".")[0]))
    .filter(n => !isNaN(n));
    
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  const seq = (max + 1).toString().padStart(3, '0');
  
  return `${seq}.${branch.code}`;
}
