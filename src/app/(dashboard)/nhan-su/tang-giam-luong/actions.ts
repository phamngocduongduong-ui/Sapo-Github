// "use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

export async function getSalaryChanges() {
  return await prisma.salaryChange.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getEmployees() {
  return await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, fullName: true, employeeCode: true }
  });
}

export async function createSalaryChange(data: any) {
  await prisma.salaryChange.create({
    data: {
      type: data.type,
      isSelf: data.isSelf,
      employeeName: data.employeeName,
      currentSalaryLevel: data.currentSalaryLevel,
      proposedSalaryLevel: data.proposedSalaryLevel,
      effectiveMonth: data.effectiveMonth,
      effectiveYear: data.effectiveYear,
      creator: data.creator,
      reason: data.reason,
      note: data.note,
      status: "Tạo mới",
    },
  });
  revalidatePath("/nhan-su/tang-giam-luong");
}

export async function updateSalaryChangeStatus(id: string, status: string) {
  let updateData: any = { status };
  
  if (status === "Đã phê duyệt") {
    const session = await getSession();
    if (session) {
      updateData.approver = session.employeeName || session.username;
    }
  }

  const updated = await prisma.salaryChange.update({
    where: { id },
    data: updateData,
  });

  if (status === "Đã phê duyệt") {
    await prisma.notification.create({
      data: {
        title: "Đề nghị đã được phê duyệt",
        message: `Đề nghị ${updated.type} của ${updated.employeeName} đã được phê duyệt.`,
        link: "/nhan-su/tang-giam-luong",
        type: "SUCCESS"
      }
    });
  }

  if (status === "Từ chối") {
    await prisma.notification.create({
      data: {
        title: "Đề nghị bị từ chối",
        message: `Đề nghị ${updated.type} của ${updated.employeeName} đã bị từ chối.`,
        link: "/nhan-su/tang-giam-luong",
        type: "ERROR"
      }
    });
  }

  if (status === "Chờ phê duyệt") {
    await prisma.notification.create({
      data: {
        title: "Đề nghị phê duyệt lương",
        message: `Nhân viên ${updated.employeeName} có đề nghị ${updated.type} cần phê duyệt.`,
        link: "/nhan-su/tang-giam-luong",
        type: "APPROVAL",
        targetRole: "ADMIN" // Adjust as needed
      }
    });
  }

  revalidatePath("/nhan-su/tang-giam-luong");
}

export async function updateSalaryChange(id: string, data: any) {
  await prisma.salaryChange.update({
    where: { id },
    data: {
      type: data.type,
      isSelf: data.isSelf,
      employeeName: data.employeeName,
      currentSalaryLevel: data.currentSalaryLevel,
      proposedSalaryLevel: data.proposedSalaryLevel,
      effectiveMonth: data.effectiveMonth,
      effectiveYear: data.effectiveYear,
      reason: data.reason,
      note: data.note,
      // Status remains same or resets to 'Tạo mới' if user wants
    },
  });
  revalidatePath("/nhan-su/tang-giam-luong");
}

export async function getCurrentEmployeeSalaryLevel(employeeName: string) {
  // Logic: Lấy bậc lương từ Hợp đồng lao động hoặc từ các Đề nghị tăng/giảm lương đã phê duyệt tùy ngày nào trễ nhất
  
  const latestContract = await prisma.laborContract.findFirst({
    where: { employeeName },
    orderBy: { startDate: "desc" },
    select: { salaryLevel: true, startDate: true }
  });

  const latestSalaryChange = await prisma.salaryChange.findFirst({
    where: { employeeName, status: "Đã phê duyệt" },
    orderBy: [
      { effectiveYear: "desc" },
      { effectiveMonth: "desc" }
    ],
    select: { proposedSalaryLevel: true, effectiveMonth: true, effectiveYear: true }
  });

  const latestTransfer = await prisma.transferPromotion.findFirst({
    where: { employeeName, status: "Đã phê duyệt" },
    orderBy: { effectiveDate: "desc" },
    select: { newSalaryLevel: true, effectiveDate: true }
  });

  // Chuyển đổi các mốc thời gian thành Date để so sánh
  let results: { level: string, date: Date }[] = [];

  if (latestContract && latestContract.startDate) {
    results.push({ level: latestContract.salaryLevel || "", date: new Date(latestContract.startDate) });
  }

  if (latestSalaryChange) {
    // Giả định ngày hiệu lực là ngày 1 của tháng/năm đó
    results.push({ 
      level: latestSalaryChange.proposedSalaryLevel, 
      date: new Date(latestSalaryChange.effectiveYear, latestSalaryChange.effectiveMonth - 1, 1) 
    });
  }

  if (latestTransfer && latestTransfer.effectiveDate) {
    results.push({ level: latestTransfer.newSalaryLevel || "", date: new Date(latestTransfer.effectiveDate) });
  }

  if (results.length === 0) return "";

  // Sắp xếp theo ngày giảm dần và lấy cái đầu tiên
  results.sort((a, b) => b.date.getTime() - a.date.getTime());

  return results[0].level;
}

export async function getCurrentUser() {
  const session = await getSession();
  return session;
}

export async function getNotifications(limit: number = 3) {
  return await prisma.notification.findMany({
    where: {
      OR: [
        { isRead: false },
        { message: { contains: "Đã phê duyệt" } } // Include approved ones as requested
      ]
    },
    orderBy: { createdAt: "desc" },
    take: limit
  });
}

export async function markNotificationAsRead(id: string) {
  await prisma.notification.update({
    where: { id },
    data: { isRead: true }
  });
  revalidatePath("/");
}
