"use server";

import { firestoreEmployees } from "@/lib/firestore-employees";
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

  // Chú ý: Việc kiểm tra trùng mã trên Firestore cần một query query
  const allEmployees = await firestoreEmployees.getAll();
  const existing = allEmployees.find(e => e.employeeCode === employeeCode);
  if (existing) throw new Error("Mã nhân viên đã tồn tại.");

  await firestoreEmployees.create({
    employeeCode,
    fullName,
    position,
    department,
    phone: phone || "",
    email: email || "",
    gender: gender || "",
    idCardNumber: idCardNumber || "",
    idCardDate: idCardDate || null,
    address: address || "",
    startDate: startDate || null,
    endDate: endDate || null,
    status: "ACTIVE",
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

  const oldEmployee = await firestoreEmployees.getById(id);
  if (!oldEmployee) throw new Error("Nhân viên không tồn tại.");

  const oldName = oldEmployee.fullName;

  await firestoreEmployees.update(id, {
    fullName,
    position,
    department,
    phone: phone || "",
    email: email || "",
    status,
    gender: gender || "",
    idCardNumber: idCardNumber || "",
    idCardDate: idCardDate || null,
    address: address || "",
    startDate: startDate || null,
    endDate: endDate || null,
  });

  // Cập nhật ở các bảng khác (vẫn đang ở Prisma)
  if (oldName !== fullName) {
    await prisma.user.updateMany({
      where: { employeeName: oldName },
      data: { employeeName: fullName }
    });

    await prisma.leaveRequest.updateMany({
      where: { employeeName: oldName },
      data: { employeeName: fullName }
    });

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
