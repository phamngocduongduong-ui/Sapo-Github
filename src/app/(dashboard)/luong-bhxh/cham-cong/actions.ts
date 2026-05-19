"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function ensureEmployee(user: { username: string; employeeName: string | null }) {
  if (!user.employeeName) return null;
  
  const fullName = user.employeeName.trim();
  let emp = await prisma.employee.findFirst({
    where: { fullName }
  });
  
  if (!emp) {
    const code = user.username === "admin" ? "NV000" : `NV${Math.floor(1000 + Math.random() * 9000)}`;
    const existing = await prisma.employee.findUnique({
      where: { employeeCode: code }
    });
    const finalCode = existing ? `NV${Math.floor(10000 + Math.random() * 90000)}` : code;
    
    emp = await prisma.employee.create({
      data: {
        employeeCode: finalCode,
        fullName: fullName,
        position: user.username === "admin" ? "Quản trị viên" : "Nhân viên",
        department: user.username === "admin" ? "Ban giám đốc" : "Văn phòng",
        status: "ACTIVE"
      }
    });
    console.log(`Auto-created employee profile for user "${user.username}" with code "${finalCode}"`);
  }
  
  return emp;
}

export async function getMyCheckins(month: number, year: number) {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  if (!user) return [];

  if (user.username === "admin") {
    return await prisma.checkin.findMany({
      where: {
        date: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1)
        }
      }
    });
  }

  if (!user.employeeName) {
    return [];
  }

  const emp = await ensureEmployee(user);
  if (!emp) return [];

  return await prisma.checkin.findMany({
    where: {
      employeeCode: emp.employeeCode,
      date: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1)
      }
    },
    orderBy: { date: "asc" }
  });
}

export async function toggleCheckIn(dateStr: string, location?: string, areaId?: string) {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  if (!user?.employeeName) throw new Error("Tài khoản chưa liên kết với nhân viên");

  const emp = await ensureEmployee(user);

  if (!emp) {
    console.error(`CheckIn Error: Could not find or create employee for "${user.employeeName}"`);
    throw new Error("Không tìm thấy hồ sơ nhân viên");
  }

  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  console.log(`CheckIn Success: ${emp.fullName} on ${date.toISOString()}`);

  const existing = await prisma.checkin.findFirst({
    where: {
      employeeCode: emp.employeeCode,
      date: date
    }
  });

  const now = new Date();

  let result;
  if (!existing) {
    // First time in day: Check In
    result = await prisma.checkin.create({
      data: {
        date: date,
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.fullName,
        location: location || "Không xác định",
        areaId: areaId,
        timeIn: now,
        note: "Chấm công tự động"
      }
    });
    console.log("Created CheckIn:", result);
  } else if (!existing.timeOut) {
    // Second time in day: Check Out
    result = await prisma.checkin.update({
      where: { id: existing.id },
      data: {
        timeOut: now,
        location: location || existing.location,
        areaId: areaId || existing.areaId
      }
    });
    console.log("Updated CheckOut:", result);
  } else {
    // Update existing out time
    result = await prisma.checkin.update({
      where: { id: existing.id },
      data: {
        timeOut: now,
        location: location || existing.location
      }
    });
    console.log("Re-updated CheckOut:", result);
  }

  revalidatePath("/luong-bhxh/cham-cong");
  return { success: true, record: result };
}
