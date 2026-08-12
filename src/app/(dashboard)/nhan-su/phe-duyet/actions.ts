"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/mail";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

import { notifyContractStatusChange } from "@/app/(dashboard)/sales/hop-dong/actions";

export async function updateApprovalStatus(id: string, type: string, newStatus: string, rejectReason?: string) {
  const data: any = { status: newStatus };

  switch (type) {
    case "LaborContract": {
      if (rejectReason) {
        const old = await (prisma as any).laborcontract.findUnique({ where: { id }, select: { note: true } });
        data.note = old?.note ? `${old.note} (Từ chối: ${rejectReason})` : `Từ chối: ${rejectReason}`;
      }
      await (prisma as any).laborcontract.update({ where: { id }, data });
      revalidatePath("/nhan-su/hop-dong");
      break;
    }
    case "LeaveRequest": {
      if (rejectReason) {
        const old = await (prisma as any).leaverequest.findUnique({ where: { id }, select: { note: true } });
        data.note = old?.note ? `${old.note} (Từ chối: ${rejectReason})` : `Từ chối: ${rejectReason}`;
      }
      const leave = await (prisma as any).leaverequest.update({ where: { id }, data });
      if (newStatus === "Đã phê duyệt") {
        const emp = await prisma.employee.findFirst({
          where: { fullName: leave.employeeName },
          select: { email: true }
        });
        if (emp?.email) {
          await sendEmail({
            to: emp.email,
            subject: "[Sapo EMS] Đơn nghỉ phép của bạn đã được phê duyệt",
            html: `
              <div style="font-family: sans-serif; line-height: 1.6; color: #334155;">
                <p>Chào bạn <strong>${leave.employeeName}</strong>,</p>
                <p>Yêu cầu nghỉ phép của bạn <strong>đã được phê duyệt</strong> thành công với thông tin chi tiết như sau:</p>
                <ul>
                  <li>Thời gian nghỉ: Từ <strong>${new Date(leave.startDate).toLocaleDateString("vi-VN")}</strong> đến hết ngày <strong>${new Date(leave.endDate).toLocaleDateString("vi-VN")}</strong></li>
                  <li>Tổng số ngày: <strong>${leave.totalDays} ngày</strong></li>
                  <li>Lý do: <em>${leave.reason} ${leave.subReason ? `(${leave.subReason})` : ''}</em></li>
                </ul>
                <p>Chúc bạn kỳ nghỉ vui vẻ và an toàn!</p>
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
      revalidatePath("/ca-nhan/nghi-phep");
      break;
    }
    case "SalaryChange": {
      if (rejectReason) {
        const old = await (prisma as any).salarychange.findUnique({ where: { id }, select: { note: true } });
        data.note = old?.note ? `${old.note} (Từ chối: ${rejectReason})` : `Từ chối: ${rejectReason}`;
      }
      const sc = await (prisma as any).salarychange.update({ where: { id }, data });
      if (newStatus === "Đã phê duyệt") {
        await (prisma as any).employee.updateMany({
          where: { fullName: sc.employeeName },
          data: { salaryLevel: sc.proposedSalaryLevel }
        });
        const emp = await prisma.employee.findFirst({
          where: { fullName: sc.employeeName },
          select: { email: true }
        });
        if (emp?.email) {
          await sendEmail({
            to: emp.email,
            subject: "[Sapo EMS] Quyết định điều chỉnh lương của bạn đã được phê duyệt",
            html: `
              <div style="font-family: sans-serif; line-height: 1.6; color: #334155;">
                <p>Chào bạn <strong>${sc.employeeName}</strong>,</p>
                <p>Đề xuất thay đổi bậc lương của bạn đã được phê duyệt chính thức:</p>
                <ul>
                  <li>Bậc lương mới: <strong>${sc.proposedSalaryLevel}</strong></li>
                  <li>Tháng áp dụng hiệu lực: <strong>Tháng ${sc.effectiveMonth}/${sc.effectiveYear}</strong></li>
                  ${sc.reason ? `<li>Lý do điều chỉnh: <em>${sc.reason}</em></li>` : ""}
                </ul>
                <p>Cảm ơn những đóng góp và nỗ lực cống hiến của bạn cho công ty!</p>
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
      revalidatePath("/nhan-su/tang-giam-luong");
      break;
    }
    case "TransferPromotion": {
      if (rejectReason) {
        const old = await (prisma as any).transferpromotion.findUnique({ where: { id }, select: { note: true } });
        data.note = old?.note ? `${old.note} (Từ chối: ${rejectReason})` : `Từ chối: ${rejectReason}`;
      }
      const tp = await (prisma as any).transferpromotion.update({ where: { id }, data });
      if (newStatus === "Đã phê duyệt") {
        await (prisma as any).employee.updateMany({
          where: { fullName: tp.employeeName },
          data: { 
            position: tp.newPosition,
            department: tp.newDepartment,
            branch: tp.branch,
            salaryLevel: tp.newSalaryLevel || undefined
          }
        });
        const emp = await prisma.employee.findFirst({
          where: { fullName: tp.employeeName },
          select: { email: true }
        });
        if (emp?.email) {
          await sendEmail({
            to: emp.email,
            subject: "[Sapo EMS] Quyết định thuyên chuyển bổ nhiệm công tác",
            html: `
              <div style="font-family: sans-serif; line-height: 1.6; color: #334155;">
                <p>Chào bạn <strong>${tp.employeeName}</strong>,</p>
                <p>Quyết định thuyên chuyển, bổ nhiệm công tác của bạn đã được ban lãnh đạo thông qua:</p>
                <ul>
                  <li>Chức vụ mới: <strong>${tp.newPosition}</strong> (trước đây: ${tp.currentPosition})</li>
                  <li>Bộ phận mới: <strong>${tp.newDepartment}</strong> (trước đây: ${tp.currentDepartment})</li>
                  <li>Chi nhánh hoạt động: <strong>${tp.branch || "Không thay đổi"}</strong></li>
                  <li>Ngày có hiệu lực: <strong>${new Date(tp.effectiveDate).toLocaleDateString("vi-VN")}</strong></li>
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
      break;
    }
    case "Resignation": {
      if (rejectReason) {
        const old = await (prisma as any).resignation.findUnique({ where: { id }, select: { note: true } });
        data.note = old?.note ? `${old.note} (Từ chối: ${rejectReason})` : `Từ chối: ${rejectReason}`;
      }
      const resignation = await (prisma as any).resignation.update({ where: { id }, data });
      if (newStatus === "Đã phê duyệt") {
        await (prisma as any).employee.updateMany({
          where: { fullName: resignation.employeeName },
          data: { status: "INACTIVE", endDate: resignation.resignationDate }
        });
        const emp = await prisma.employee.findFirst({
          where: { fullName: resignation.employeeName },
          select: { email: true }
        });
        if (emp?.email) {
          await sendEmail({
            to: emp.email,
            subject: "[Sapo EMS] Đơn xin thôi việc của bạn đã được phê duyệt",
            html: `
              <div style="font-family: sans-serif; line-height: 1.6; color: #334155;">
                <p>Chào bạn <strong>${resignation.employeeName}</strong>,</p>
                <p>Đơn xin thôi việc của bạn đã được ban giám đốc phê duyệt.</p>
                <ul>
                  <li>Ngày làm việc cuối cùng: <strong>${new Date(resignation.resignationDate).toLocaleDateString("vi-VN")}</strong></li>
                  <li>Lý do nghỉ việc: <em>${resignation.reason}</em></li>
                </ul>
                <p>Bạn vui lòng liên hệ bộ phận nhân sự và trưởng bộ phận để hoàn tất việc bàn giao tài sản cũng như công việc liên quan trước ngày làm việc cuối cùng.</p>
                <p>Chúc bạn may mắn và thành công trên con đường sắp tới!</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b; margin-top: 10px;">
                  Hệ thống Sapo EMS • Ban Giám đốc<br />
                  <span style="font-size: 11px; color: #94a3b8; font-style: italic;">Đây là thư tự động gửi từ hệ thống. Vui lòng không trả lời lại email này.</span>
                </p>
              </div>
            `
          });
        }
      }
      revalidatePath("/ca-nhan/nghi-viec");
      break;
    }
    case "Payroll": {
      if (rejectReason) {
        const old = await (prisma as any).payroll.findUnique({ where: { id }, select: { note: true } });
        data.note = old?.note ? `${old.note} (Từ chối: ${rejectReason})` : `Từ chối: ${rejectReason}`;
      }
      await (prisma as any).payroll.update({ where: { id }, data });
      revalidatePath("/nhan-su/bang-luong");
      break;
    }
    case "PurchaseOrder": {
      if (rejectReason) {
        const old = await (prisma as any).purchaseorder.findUnique({ where: { id }, select: { note: true } });
        data.note = old?.note ? `${old.note} (Từ chối: ${rejectReason})` : `Từ chối: ${rejectReason}`;
      }
      await (prisma as any).purchaseorder.update({ where: { id }, data });
      revalidatePath("/purchasing/lenh-mua");
      break;
    }
    case "Contract": {
      const session = await getSession();
      const oldContract = await (prisma as any).contract.findUnique({ where: { id } });
      if (rejectReason) {
        data.note = oldContract?.note ? `${oldContract.note} (Từ chối: ${rejectReason})` : `Từ chối: ${rejectReason}`;
      }
      const updatedContract = await (prisma as any).contract.update({ where: { id }, data });

      const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
      const changedBy = user?.employeeName || user?.username || "Hệ thống";

      await logAudit({
        tableName: "Contract",
        recordId: id,
        action: "STATUS_CHANGE",
        oldData: { status: oldContract?.status },
        newData: { status: newStatus },
        changedBy,
        changeDetail: newStatus === "Đã phê duyệt" ? "Phê duyệt hợp đồng" : `Từ chối hợp đồng: ${rejectReason || ""}`,
      });

      if (oldContract?.status !== newStatus) {
        await notifyContractStatusChange(updatedContract, newStatus, changedBy);
      }

      revalidatePath("/sales/hop-dong");
      revalidatePath("/phe-duyet/hop-dong-ban-hang");
      break;
    }
  }

  revalidatePath("/nhan-su/phe-duyet");
}
