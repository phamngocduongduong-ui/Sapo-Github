// // "use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getCurrentUser(session: any) {
  return await prisma.user.findUnique({
    where: { username: session.username }
  });
}

export async function updateAccountInfo(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Chưa đăng nhập");

  const user = await getCurrentUser(session);
  if (!user) throw new Error("Không tìm thấy người dùng");

  const fullName = formData.get("fullName") as string;
  const branch = formData.get("branch") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const position = formData.get("position") as string;
  const department = formData.get("department") as string;
  const address = formData.get("address") as string;
  const idCardNumber = formData.get("idCardNumber") as string;
  const idCardDateStr = formData.get("idCardDate") as string;
  const maritalStatus = formData.get("maritalStatus") as string;
  const educationLevel = formData.get("educationLevel") as string;
  const gender = formData.get("gender") as string;

  const idCardDate = idCardDateStr ? new Date(idCardDateStr) : null;

  let employeeId = user.employeeId;

  if (employeeId) {
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        fullName,
        phone,
        email,
        position,
        department,
        address,
        idCardNumber,
        idCardDate,
        maritalStatus,
        educationLevel,
        gender
      }
    });
  } else {
    let employee = await prisma.employee.findFirst({
      where: { fullName: user.employeeName || session.username }
    });

    if (employee) {
      employee = await prisma.employee.update({
        where: { id: employee.id },
        data: {
          fullName,
          phone,
          email,
          position,
          department,
          address,
          idCardNumber,
          idCardDate,
          maritalStatus,
          educationLevel,
          gender
        }
      });
      employeeId = employee.id;
    } else {
      // Tạo mới employee
      const newEmployee = await prisma.employee.create({
        data: {
          employeeCode: `NV-${Math.floor(Math.random() * 10000)}`,
          fullName,
          phone,
          email,
          position,
          department,
          address,
          status: "ACTIVE"
        }
      });
      employeeId = newEmployee.id;
    }
  }

  // Luôn cập nhật User để đồng bộ tên và employeeId
  await prisma.user.update({
    where: { username: session.username },
    data: { 
      employeeName: fullName, 
      employeeId: employeeId,
      branch 
    }
  });

  revalidatePath("/profile");
  redirect("/profile?tab=1");
}

export async function createSalaryRequest(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Chưa đăng nhập");

  const user = await getCurrentUser(session);
  const employeeName = user?.employeeName || session.username;

  const currentSalary = parseFloat(formData.get("currentSalary") as string) || 0;
  const proposedSalary = parseFloat(formData.get("proposedSalary") as string);
  const reason = formData.get("reason") as string;

  if (!proposedSalary || !reason) {
    throw new Error("Vui lòng điền đầy đủ thông tin");
  }

  await prisma.salaryIncreaseRequest.create({
    data: {
      employeeName,
      currentSalary,
      proposedSalary,
      reason,
      status: "Tạo mới"
    }
  });

  revalidatePath("/profile");
}
