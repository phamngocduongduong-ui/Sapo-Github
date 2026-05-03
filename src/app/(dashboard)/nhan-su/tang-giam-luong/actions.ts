"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function getSalaryChanges() {
  const session = await getSession();
  if (!session) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const userBranches = user?.branch ? user.branch.split(",").map(b => b.trim()).filter(Boolean) : [];

  return await (prisma as any).salarychange.findMany({
    where: isAdmin ? {} : {
      branch: { in: userBranches }
    },
    orderBy: { createdAt: "desc" },
  });
}


export async function getEmployees() {
  const session = await getSession();
  if (!session) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const userBranches = user?.branch ? user.branch.split(",").map(b => b.trim()).filter(Boolean) : [];

  return await (prisma as any).employee.findMany({
    where: { 
      status: "ACTIVE",
      ...(isAdmin ? {} : { branch: { in: userBranches } })
    },
    select: { id: true, fullName: true, employeeCode: true, branch: true }
  });
}

async function generateNextSalaryChangeCode() {
  const all = await (prisma as any).salarychange.findMany({
    select: { changeCode: true }
  });
  const nums = all
    .map((r: any) => r.changeCode ? parseInt(r.changeCode.substring(3)) : 0) // TGL is 3 chars
    .filter((n: any) => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `TGL${(max + 1).toString().padStart(4, "0")}`;
}

export async function createSalaryChange(data: any) {
  const employee = await prisma.employee.findFirst({
    where: { fullName: data.employeeName }
  });

  const changeCode = await generateNextSalaryChangeCode();

  const salaryChange = await (prisma as any).salarychange.create({
    data: {
      changeCode,
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
      branch: employee?.branch || "",
      status: "Tạo mới",
    },
  });

  const session = await getSession();
  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "SalaryChange",
    recordId: salaryChange.id,
    action: "CREATE",
    newData: salaryChange,
    changedBy,
    changeDetail: `Tạo đề nghị ${data.type} cho ${data.employeeName}`
  });
  revalidatePath("/nhan-su/tang-giam-luong");
}

export async function updateSalaryChangeStatus(id: string, status: string) {
  let updateData: any = { status };
  
  if (status === "Đã phê duyệt") {
    const session = await getSession();
    if (session) {
      const user = await prisma.user.findUnique({ where: { id: session.userId } });
      updateData.approver = user?.employeeName || user?.username || "Admin";
    }
  }

  const session = await getSession();
  const oldSalaryChange = await (prisma as any).salarychange.findUnique({ where: { id } });

  const updated = await (prisma as any).salarychange.update({
    where: { id },
    data: updateData,
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "SalaryChange",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldSalaryChange?.status },
    newData: { status },
    changedBy,
    changeDetail: `Chuyển trạng thái đề nghị lương sang: ${status}`
  });

  if (status === "Đã phê duyệt") {
    await (prisma as any).notification.create({
      data: {
        title: "Đề nghị đã được phê duyệt",
        message: `Đề nghị ${updated.type} của ${updated.employeeName} đã được phê duyệt.`,
        link: "/nhan-su/tang-giam-luong",
        type: "SUCCESS"
      }
    });
  }

  if (status === "Từ chối") {
    await (prisma as any).notification.create({
      data: {
        title: "Đề nghị bị từ chối",
        message: `Đề nghị ${updated.type} của ${updated.employeeName} đã bị từ chối.`,
        link: "/nhan-su/tang-giam-luong",
        type: "ERROR"
      }
    });
  }

  if (status === "Chờ phê duyệt") {
    await (prisma as any).notification.create({
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
  const session = await getSession();
  const oldSalaryChange = await (prisma as any).salarychange.findUnique({ where: { id } });

  const employee = await prisma.employee.findFirst({
    where: { fullName: data.employeeName }
  });

  const updatedSalaryChange = await (prisma as any).salarychange.update({
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
      branch: employee?.branch || undefined,
    },
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "SalaryChange",
    recordId: id,
    action: "UPDATE",
    oldData: oldSalaryChange,
    newData: updatedSalaryChange,
    changedBy,
    changeDetail: "Cập nhật thông tin đề nghị tăng/giảm lương"
  });

  revalidatePath("/nhan-su/tang-giam-luong");
}

export async function getCurrentEmployeeSalaryLevel(employeeName: string) {
  // Logic: Lấy bậc lương từ Hợp đồng lao động hoặc từ các Đề nghị tăng/giảm lương đã phê duyệt tùy ngày nào trễ nhất
  
  const latestContract = await (prisma as any).laborcontract.findFirst({
    where: { employeeName },
    orderBy: { startDate: "desc" },
    select: { salaryLevel: true, startDate: true }
  });

  const latestSalaryChange = await (prisma as any).salarychange.findFirst({
    where: { employeeName, status: "Đã phê duyệt" },
    orderBy: [
      { effectiveYear: "desc" },
      { effectiveMonth: "desc" }
    ],
    select: { proposedSalaryLevel: true, effectiveMonth: true, effectiveYear: true }
  });

  const latestTransfer = await (prisma as any).transferpromotion.findFirst({
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
  return await (prisma as any).notification.findMany({
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
  await (prisma as any).notification.update({
    where: { id },
    data: { isRead: true }
  });
  revalidatePath("/");
}

