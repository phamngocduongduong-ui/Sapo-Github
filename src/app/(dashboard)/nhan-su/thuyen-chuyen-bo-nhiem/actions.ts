"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/mail";

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
      id: require('crypto').randomUUID(),
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

    const emp = await prisma.employee.findFirst({
      where: { fullName: item.employeeName },
      select: { email: true }
    });
    if (emp?.email) {
      await sendEmail({
        to: emp.email,
        subject: "[Sapo EMS] Quyết định thuyên chuyển bổ nhiệm công tác",
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #334155;">
            <p>Chào bạn <strong>${item.employeeName}</strong>,</p>
            <p>Quyết định thuyên chuyển, bổ nhiệm công tác của bạn đã được ban lãnh đạo thông qua:</p>
            <ul>
              <li>Chức vụ mới: <strong>${item.newPosition}</strong> (trước đây: ${item.currentPosition})</li>
              <li>Bộ phận mới: <strong>${item.newDepartment}</strong> (trước đây: ${item.currentDepartment})</li>
              <li>Chi nhánh hoạt động: <strong>${item.branch || "Không thay đổi"}</strong></li>
              <li>Ngày có hiệu lực: <strong>${new Date(item.effectiveDate).toLocaleDateString("vi-VN")}</strong></li>
            </ul>
            <p>Chúc bạn gặt hái được nhiều thành công mới ở vai trò mới!</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b; margin-top: 10px;">
              Hệ thống Sapo EMS • Phòng Nhân sự<br />
              <span style="font-size: 11px; color: #94a3b8; font-style: italic;">Đây là thư tự động gửi từ hệ thống. Vui lòng không trả lời lại email này.</span>
            </p>
          </div>
        `
      });
    }
  }

  revalidatePath("/nhan-su/thuyen-chuyen-bo-nhiem");
}

export async function getActiveDepartments() {
  return await prisma.department.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });
}

export async function getActivePositions() {
  return await prisma.position.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });
}

