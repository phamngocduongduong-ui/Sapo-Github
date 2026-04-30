"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

export async function getTransferPromotions() {
  const session = await getSession();
  if (!session) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const userBranches = user?.branch ? user.branch.split(",").map(b => b.trim()).filter(Boolean) : [];

  return await prisma.transferPromotion.findMany({
    where: isAdmin ? {} : {
      branch: { in: userBranches }
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTransferPromotion(formData: FormData) {
  const employeeName = formData.get("employeeName") as string;
  const newPosition = formData.get("newPosition") as string;
  const newDepartment = formData.get("newDepartment") as string;
  const newSalaryLevel = formData.get("newSalaryLevel") as string;
  const effectiveDate = formData.get("effectiveDate") as string;
  const note = formData.get("note") as string;
  const creator = formData.get("creator") as string;

  const employee = await prisma.employee.findFirst({
    where: { fullName: employeeName }
  });

  await prisma.transferPromotion.create({
    data: {
      employeeName,
      branch: employee?.branch || "",
      currentPosition: employee?.position || "",
      newPosition,
      currentDepartment: employee?.department || "",
      newDepartment,
      currentSalaryLevel: employee?.salaryLevel || "",
      newSalaryLevel,
      effectiveDate: new Date(effectiveDate),
      creator,
      note,
      status: "Tạo mới"
    }
  });

  revalidatePath("/nhan-su/thuyen-chuyen-bo-nhiem");
}
export async function updateTransferStatus(id: string, status: string) {
  const item = await prisma.transferPromotion.update({
    where: { id },
    data: { status }
  });

  if (status === "Đã phê duyệt") {
    // Update employee with new position/department
    await prisma.employee.updateMany({
      where: { fullName: item.employeeName },
      data: {
        position: item.newPosition,
        department: item.newDepartment,
        salaryLevel: item.newSalaryLevel
      }
    });
  }

  revalidatePath("/nhan-su/thuyen-chuyen-bo-nhiem");
}
