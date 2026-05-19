"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function getResignations(isAdmin: boolean, userBranches: string[]) {
  return await (prisma as any).resignation.findMany({
    where: isAdmin ? {} : {
      branch: { in: userBranches }
    },
    orderBy: { createdAt: "desc" }
  });
}

async function generateNextResignationCode() {
  const all = await (prisma as any).resignation.findMany({
    select: { resignationCode: true }
  });
  const nums = all
    .map((r: any) => r.resignationCode ? parseInt(r.resignationCode.substring(2)) : 0)
    .filter((n: number) => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `NV${(max + 1).toString().padStart(4, "0")}`;
}

export async function createResignation(formData: FormData) {
  const employeeName = formData.get("employeeName") as string;
  const resignationDate = formData.get("resignationDate") as string;
  const reason = formData.get("reason") as string;
  const note = formData.get("note") as string;
  const branch = formData.get("branch") as string;

  if (!employeeName || !resignationDate || !reason) {
    throw new Error("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
  }

  // Fetch branch directly from employee record for accuracy
  const employee = await prisma.employee.findFirst({
    where: { fullName: employeeName }
  });

  const resignationCode = await generateNextResignationCode();

  const resignation = await (prisma as any).resignation.create({
    data: {
      id: crypto.randomUUID(),
      resignationCode,
      employeeName,
      branch: employee?.branch || branch || "",
      resignationDate: new Date(resignationDate),
      reason,
      note,
      status: "Tạo mới"
    }
  });

  const session = await getSession();
  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "Resignation",
    recordId: resignation.id,
    action: "CREATE",
    newData: resignation,
    changedBy,
    changeDetail: `Tạo đơn xin nghỉ việc: ${employeeName}`
  });

  revalidatePath("/nhan-su/nghi-viec");
  revalidatePath("/nhan-su/phe-duyet");
}

export async function updateResignation(id: string, formData: FormData) {
  const resignationDate = formData.get("resignationDate") as string;
  const reason = formData.get("reason") as string;
  const note = formData.get("note") as string;

  const session = await getSession();
  const oldResignation = await (prisma as any).resignation.findUnique({ where: { id } });

  const updatedResignation = await (prisma as any).resignation.update({
    where: { id },
    data: {
      resignationDate: new Date(resignationDate),
      reason,
      note
    }
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "Resignation",
    recordId: id,
    action: "UPDATE",
    oldData: oldResignation,
    newData: updatedResignation,
    changedBy,
    changeDetail: "Cập nhật thông tin đơn xin nghỉ việc"
  });

  revalidatePath("/nhan-su/nghi-viec");
}

export async function updateResignationStatus(id: string, status: string) {
  const session = await getSession();
  const oldResignation = await (prisma as any).resignation.findUnique({ where: { id } });

  await (prisma as any).resignation.update({
    where: { id },
    data: { status }
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "Resignation",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldResignation?.status },
    newData: { status },
    changedBy,
    changeDetail: `Chuyển trạng thái đơn nghỉ việc sang: ${status}`
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
