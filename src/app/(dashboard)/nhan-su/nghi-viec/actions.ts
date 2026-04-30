"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

export async function getResignations() {
  return await (prisma as any).resignation.findMany({
    orderBy: { createdAt: "desc" }
  });
}

export async function createResignation(formData: FormData) {
  const employeeName = formData.get("employeeName") as string;
  const resignationDate = formData.get("resignationDate") as string;
  const reason = formData.get("reason") as string;
  const note = formData.get("note") as string;

  if (!employeeName || !resignationDate || !reason) {
    throw new Error("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
  }

  // Get employee branch
  const employee = await prisma.employee.findFirst({
    where: { fullName: employeeName }
  });

  await (prisma as any).resignation.create({
    data: {
      employeeName,
      branch: employee?.branch || "",
      resignationDate: new Date(resignationDate),
      reason,
      note,
      status: "Tạo mới"
    }
  });

  revalidatePath("/nhan-su/nghi-viec");
  revalidatePath("/nhan-su/phe-duyet");
}

export async function updateResignationStatus(id: string, status: string) {
  await (prisma as any).resignation.update({
    where: { id },
    data: { status }
  });

  // If approved, update employee status
  if (status === "Đã phê duyệt") {
    const resignation = await (prisma as any).resignation.findUnique({ where: { id } });
    if (resignation) {
      await prisma.employee.updateMany({
        where: { fullName: resignation.employeeName },
        data: { status: "INACTIVE", endDate: resignation.resignationDate }
      });
    }
  }

  revalidatePath("/nhan-su/nghi-viec");
  revalidatePath("/nhan-su/phe-duyet");
}
