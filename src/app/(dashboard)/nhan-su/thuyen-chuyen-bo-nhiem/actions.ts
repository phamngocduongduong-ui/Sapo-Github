"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function getTransferPromotions() {
  const session = await getSession();
  if (!session) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const userBranches = user?.branch ? user.branch.split(",").map(b => b.trim()).filter(Boolean) : [];

  return await (prisma as any).transferpromotion.findMany({
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

  const tp = await (prisma as any).transferpromotion.create({
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

  const session = await getSession();
  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "TransferPromotion",
    recordId: tp.id,
    action: "CREATE",
    newData: tp,
    changedBy,
    changeDetail: `Tạo đơn thuyên chuyển/bổ nhiệm cho ${employeeName}`
  });

  revalidatePath("/nhan-su/thuyen-chuyen-bo-nhiem");
}
export async function updateTransferStatus(id: string, status: string) {
  const session = await getSession();
  const oldTP = await (prisma as any).transferpromotion.findUnique({ where: { id } });

  const item = await (prisma as any).transferpromotion.update({
    where: { id },
    data: { status }
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "TransferPromotion",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldTP?.status },
    newData: { status },
    changedBy,
    changeDetail: `Chuyển trạng thái đơn thuyên chuyển sang: ${status}`
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
