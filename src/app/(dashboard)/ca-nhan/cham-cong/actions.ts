"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

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

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function toggleCheckIn(dateStr: string, location?: string, areaId?: string, clientSecret?: string) {
  try {
    const session = await getSession();
    if (!session?.userId) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user?.employeeName) throw new Error("Tài khoản chưa liên kết với nhân viên");

    // Prevent check-in on Windows (except for admin)
    if (user.username !== "admin") {
      const userAgent = headers().get("user-agent") || "";
      if (/Windows/i.test(userAgent)) {
        throw new Error("Không cho phép chấm công trên máy tính Windows. Vui lòng sử dụng điện thoại để chấm công.");
      }
    }

    // Skip device verification for admin user
    if (user.username !== "admin") {
      if (!clientSecret) {
        throw new Error("Không tìm thấy thông tin xác thực thiết bị.");
      }

      const userAgent = headers().get("user-agent") || "";
      const isMobileDevice = !/Windows/i.test(userAgent);

      if (user.deviceSecret) {
        if (user.deviceSecret !== clientSecret) {
          if (isMobileDevice) {
            // Auto-update device secret for all mobile devices (Android, iOS, PWA, etc.)
            await prisma.user.update({
              where: { id: user.id },
              data: {
                deviceSecret: clientSecret,
                pendingDeviceSecret: null,
                deviceStatus: "APPROVED"
              }
            });
            console.log(`Auto-updated mobile device secret for user "${user.username}"`);
          } else {
            if (user.deviceStatus === "PENDING") {
              throw new Error("Thiết bị mới của bạn đang chờ phê duyệt từ Admin. Vui lòng liên hệ Admin.");
            }
            throw new Error("Thiết bị này không hợp lệ hoặc tài khoản đã liên kết với thiết bị khác.");
          }
        }
      } else {
        // First time registration: bind the device
        await prisma.user.update({
          where: { id: user.id },
          data: {
            deviceSecret: clientSecret,
            deviceStatus: "APPROVED"
          }
        });
        console.log(`Auto-bound device for user "${user.username}"`);
      }

      // Location verification
      if (!areaId) {
        throw new Error("Vui lòng chọn khu vực chấm công hợp lệ.");
      }
      if (!location || location === "Không xác định" || location === "Vị trí không xác định") {
        throw new Error("Không thể xác định vị trí GPS của bạn. Vui lòng bật định vị trên thiết bị.");
      }

      const coords = location.split(",").map(coord => parseFloat(coord.trim()));
      if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
        throw new Error("Tọa độ GPS không hợp lệ.");
      }

      const [lat, lng] = coords;

      const area = await prisma.checkin_area.findUnique({
        where: { id: areaId }
      });

      if (!area || area.status !== "ACTIVE") {
        throw new Error("Khu vực chấm công không hoạt động hoặc không tồn tại.");
      }

      const dist = getDistance(lat, lng, area.latitude, area.longitude);
      if (dist > area.radius) {
        throw new Error(`Bạn đang ở ngoài bán kính cho phép của khu vực "${area.name}" (Khoảng cách: ${dist.toFixed(0)}m, Bán kính cho phép: ${area.radius}m).`);
      }
    }

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

    // Prevent check-out if worked less than 2 hours (except for admin)
    if (user.username !== "admin" && existing && existing.timeIn) {
      const timeDiffMs = now.getTime() - existing.timeIn.getTime();
      const minDiffMs = 2 * 60 * 60 * 1000; // 2 hours
      if (timeDiffMs < minDiffMs) {
        const remainingMinutes = Math.ceil((minDiffMs - timeDiffMs) / (60 * 1000));
        throw new Error(`Bạn chưa thể chấm công ra. Thời gian làm việc kể từ lúc vào phải tối thiểu là 2 tiếng (cần thêm ${remainingMinutes} phút nữa).`);
      }
    }

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

    revalidatePath("/ca-nhan/cham-cong");
    return { success: true, record: result };
  } catch (err: any) {
    console.error("Error in toggleCheckIn:", err);
    return { success: false, error: err.message || "Có lỗi xảy ra" };
  }
}

export async function getUserDeviceStatus() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      username: true,
      deviceSecret: true,
      pendingDeviceSecret: true,
      deviceStatus: true,
      deviceChangeReason: true,
      deviceInfo: true,
      accessSource: true
    }
  });

  return user;
}

export async function requestDeviceChange(
  pendingSecret: string,
  reason?: string,
  deviceInfo?: string,
  accessSource?: string
) {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  if (!user) throw new Error("Người dùng không tồn tại");

  // Check hardware fingerprint matching or exact secret matching
  const extractHwFp = (sec?: string | null) => {
    if (!sec || !sec.startsWith("hwfp_")) return null;
    const parts = sec.split("_");
    return parts.length >= 2 ? `${parts[0]}_${parts[1]}` : null;
  };

  const currentHwFp = extractHwFp(user.deviceSecret);
  const pendingHwFp = extractHwFp(pendingSecret);

  const userAgent = headers().get("user-agent") || "";
  const isMobileDevice = !/Windows/i.test(userAgent);

  const isSameHardware = (currentHwFp && pendingHwFp && currentHwFp === pendingHwFp) ||
                         (user.deviceSecret && user.deviceSecret === pendingSecret);

  if (isSameHardware || isMobileDevice) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        deviceSecret: pendingSecret,
        pendingDeviceSecret: null,
        deviceStatus: "APPROVED",
        deviceInfo: deviceInfo || null,
        accessSource: accessSource || null
      }
    });
    revalidatePath("/ca-nhan/cham-cong");
    return { success: true, autoApproved: true };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pendingDeviceSecret: pendingSecret,
      deviceStatus: "PENDING",
      deviceChangeReason: reason || "Thay đổi thiết bị/trình duyệt",
      deviceInfo: deviceInfo || null,
      accessSource: accessSource || null
    }
  });

  revalidatePath("/ca-nhan/cham-cong");
  return { success: true, autoApproved: false };
}

export async function syncDeviceCookie(username: string, encryptedSecret: string) {
  try {
    const { cookies } = require("next/headers");
    const cookieStore = cookies();
    cookieStore.set(`ems_dev_sec_${username}`, encryptedSecret, {
      path: "/",
      maxAge: 315360000, // 10 years (browser will cap at 400 days)
      sameSite: "lax",
      secure: true,
      httpOnly: false // Allow client-side JS to read and sync it
    });
    return { success: true };
  } catch (error) {
    console.error("Error setting server-side cookie:", error);
    return { success: false };
  }
}


