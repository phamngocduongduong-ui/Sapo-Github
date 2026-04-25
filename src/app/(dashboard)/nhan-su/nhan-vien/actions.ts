"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

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

  if (!employeeCode || !fullName || !position || !department) {
    throw new Error("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
  }

  const existing = await prisma.employee.findUnique({ where: { employeeCode } });
  if (existing) throw new Error("Mã nhân viên đã tồn tại.");

  await prisma.employee.create({
    data: {
      employeeCode,
      fullName,
      position,
      department,
      phone: phone || null,
      email: email || null,
      gender: gender || null,
      idCardNumber: idCardNumber || null,
      idCardDate: idCardDate ? new Date(idCardDate) : null,
      address: address || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
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

  // Lấy thông tin cũ để kiểm tra xem tên có đổi không
  const oldEmployee = await prisma.employee.findUnique({ where: { id } });
  if (!oldEmployee) throw new Error("Nhân viên không tồn tại.");

  const oldName = oldEmployee.fullName;

  // Cập nhật thông tin nhân viên
  await prisma.employee.update({
    where: { id },
    data: {
      fullName,
      position,
      department,
      phone: phone || null,
      email: email || null,
      status,
      gender: gender || null,
      idCardNumber: idCardNumber || null,
      idCardDate: idCardDate ? new Date(idCardDate) : null,
      address: address || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  // Nếu tên thay đổi, cập nhật tự động ở các bảng liên quan
  if (oldName !== fullName) {
    // 1. Cập nhật trong bảng Tài khoản (User)
    await prisma.user.updateMany({
      where: { employeeName: oldName },
      data: { employeeName: fullName }
    });

    // 2. Cập nhật trong bảng Nghỉ phép (LeaveRequest)
    await prisma.leaveRequest.updateMany({
      where: { employeeName: oldName },
      data: { employeeName: fullName }
    });

    // 3. Cập nhật trong bảng Lệnh điều động (DispatchOrder)
    await prisma.dispatchOrder.updateMany({
      where: { employeeName: oldName },
      data: { employeeName: fullName }
    });
  }

  revalidatePath("/nhan-su/nhan-vien");
  revalidatePath("/admin");
  revalidatePath("/nhan-su/nghi-phep");
  revalidatePath("/purchasing/dispatch");
}
