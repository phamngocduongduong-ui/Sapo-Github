"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

async function getCurrentEmployeeName(session: any) {
  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });
  return user?.employeeName || user?.username || "User";
}

async function generateNextLeaveCode() {
  const all = await (prisma as any).leaverequest.findMany({
    select: { leaveCode: true }
  });
  const nums = all
    .map((r: any) => r.leaveCode ? parseInt(r.leaveCode.substring(2)) : 0)
    .filter((n: any) => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `NP${(max + 1).toString().padStart(4, "0")}`;
}

export async function createLeaveRequest(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Bạn chưa đăng nhập.");

  const sessionName = await getCurrentEmployeeName(session);
  const employeeName = (formData.get("employeeName") as string) || sessionName;
  const employee = await prisma.employee.findFirst({
    where: { fullName: employeeName }
  });


  const startDateStr = formData.get("startDate") as string;
  const endDateStr = formData.get("endDate") as string;
  const reason = formData.get("reason") as string;
  const subReason = formData.get("subReason") as string;
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

  const leaveCode = await generateNextLeaveCode();

  const leaveRequest = await (prisma as any).leaverequest.create({
    data: {
      leaveCode,
      employeeName,
      startDate,
      endDate,
      totalDays,
      reason,
      subReason: subReason || null,
      note: note || null,
      branch: employee?.branch || null,
      status: "Tạo mới",
    },
  });

  await logAudit({
    tableName: "LeaveRequest",
    recordId: leaveRequest.id,
    action: "CREATE",
    newData: leaveRequest,
    changedBy: sessionName,
    changeDetail: `Tạo đơn nghỉ phép mới: ${reason}`
  });

  revalidatePath("/nhan-su/nghi-phep");
  revalidatePath("/profile");
}

export async function updateLeaveRequest(id: string, formData: FormData) {
  const startDateStr = formData.get("startDate") as string;
  const endDateStr = formData.get("endDate") as string;
  const reason = formData.get("reason") as string;
  const subReason = formData.get("subReason") as string;
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

  const currentRequest = await (prisma as any).leaverequest.findUnique({ where: { id } });
  const employee = await prisma.employee.findFirst({
    where: { fullName: currentRequest?.employeeName || "" }
  });


  const oldRequest = await (prisma as any).leaverequest.findUnique({ where: { id } });

  const updatedRequest = await (prisma as any).leaverequest.update({
    where: { id },
    data: {
      startDate,
      endDate,
      totalDays,
      reason,
      subReason: subReason || null,
      note: note || null,
      branch: employee?.branch || undefined,
    },
  });

  const session = await getSession();
  const sessionUser = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = sessionUser?.employeeName || sessionUser?.username || "Admin";

  await logAudit({
    tableName: "LeaveRequest",
    recordId: id,
    action: "UPDATE",
    oldData: oldRequest,
    newData: updatedRequest,
    changedBy,
    changeDetail: "Cập nhật thông tin đơn nghỉ phép"
  });

  revalidatePath("/nhan-su/nghi-phep");
  revalidatePath("/profile");
}

export async function updateLeaveStatus(id: string, newStatus: string) {
  const session = await getSession();
  const oldRequest = await (prisma as any).leaverequest.findUnique({ where: { id } });

  const updatedRequest = await (prisma as any).leaverequest.update({
    where: { id },
    data: { status: newStatus },
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "System";

  await logAudit({
    tableName: "LeaveRequest",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldRequest?.status },
    newData: { status: newStatus },
    changedBy,
    changeDetail: `Chuyển trạng thái sang: ${newStatus}`
  });

  revalidatePath("/nhan-su/nghi-phep");
  revalidatePath("/profile");
}

