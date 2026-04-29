// "use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function getCurrentEmployeeName(session: any) {
  const user = await prisma.user.findUnique({
    where: { username: session.username }
  });
  return user?.employeeName || session.username;
}

export async function createLeaveRequest(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Bạn chưa đăng nhập.");

  const employeeName = await getCurrentEmployeeName(session);

  const startDateStr = formData.get("startDate") as string;
  const endDateStr = formData.get("endDate") as string;
  const reason = formData.get("reason") as string;
  const note = formData.get("note") as string;

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate < today) {
    throw new Error("Ngày bắt đầu không được nhỏ hơn ngày hiện tại.");
  }
  if (endDate < startDate) {
    throw new Error("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.");
  }

  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  await prisma.leaveRequest.create({
    data: {
      employeeName,
      startDate,
      endDate,
      totalDays,
      reason,
      note: note || null,
      status: "Tạo mới",
    },
  });

  revalidatePath("/nhan-su/nghi-phep");
  revalidatePath("/profile");
}

export async function updateLeaveRequest(id: string, formData: FormData) {
  const startDateStr = formData.get("startDate") as string;
  const endDateStr = formData.get("endDate") as string;
  const reason = formData.get("reason") as string;
  const note = formData.get("note") as string;

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate < today) {
    throw new Error("Ngày bắt đầu không được nhỏ hơn ngày hiện tại.");
  }
  if (endDate < startDate) {
    throw new Error("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.");
  }

  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  await prisma.leaveRequest.update({
    where: { id },
    data: {
      startDate,
      endDate,
      totalDays,
      reason,
      note: note || null,
    },
  });

  revalidatePath("/nhan-su/nghi-phep");
  revalidatePath("/profile");
}

export async function updateLeaveStatus(id: string, newStatus: string) {
  await prisma.leaveRequest.update({
    where: { id },
    data: { status: newStatus },
  });
  revalidatePath("/nhan-su/nghi-phep");
  revalidatePath("/profile");
}
