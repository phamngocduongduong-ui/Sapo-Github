"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateApprovalStatus(id: string, type: string, newStatus: string) {
  const data = { status: newStatus };

  switch (type) {
    case "LaborContract":
      await prisma.laborContract.update({ where: { id }, data });
      revalidatePath("/nhan-su/hop-dong");
      break;
    case "LeaveRequest":
      await prisma.leaveRequest.update({ where: { id }, data });
      revalidatePath("/nhan-su/nghi-phep");
      break;
    case "SalaryChange":
      await prisma.salaryChange.update({ where: { id }, data });
      revalidatePath("/nhan-su/tang-giam-luong");
      break;
    case "TransferPromotion":
      await prisma.transferPromotion.update({ where: { id }, data });
      revalidatePath("/nhan-su/thuyen-chuyen-bo-nhiem");
      break;
    case "Resignation":
      await (prisma as any).resignation.update({ where: { id }, data });
      // If approved, maybe update employee status to INACTIVE?
      if (newStatus === "Đã phê duyệt") {
        const resignation = await (prisma as any).resignation.findUnique({ where: { id } });
        if (resignation) {
          await prisma.employee.updateMany({
            where: { fullName: resignation.employeeName },
            data: { status: "INACTIVE", endDate: resignation.resignationDate }
          });
        }
      }
      break;
    case "Payroll":
      await prisma.payroll.update({ where: { id }, data });
      revalidatePath("/nhan-su/bang-luong");
      break;
  }

  revalidatePath("/nhan-su/phe-duyet");
}
