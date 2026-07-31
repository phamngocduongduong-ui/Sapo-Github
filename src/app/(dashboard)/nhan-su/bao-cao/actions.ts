"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

// Fetch all active employees (excluding admins) for the multi-select dropdown/modal
export async function getAllEmployees() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  // Fetch admin names
  const adminUsers = await prisma.user.findMany({
    where: {
      OR: [
        { username: "admin" },
        { role: "Admin" }
      ]
    },
    select: { employeeName: true }
  });
  const adminNames = new Set(
    adminUsers
      .map(u => u.employeeName?.trim().toLowerCase())
      .filter(Boolean)
  );

  const rawEmployees = await prisma.employee.findMany({
    where: {
      status: {
        notIn: ["Nghỉ việc", "INACTIVE"]
      }
    },
    orderBy: { fullName: "asc" }
  });

  return rawEmployees.filter(emp => {
    const code = emp.employeeCode;
    const name = emp.fullName.trim().toLowerCase();
    if (code === "NV000") return false;
    if (name.includes("admin")) return false;
    if (adminNames.has(name)) return false;
    return true;
  }).map(emp => ({
    employeeCode: emp.employeeCode,
    fullName: emp.fullName,
    branch: emp.branch || ""
  }));
}

// Fetch all active branches
export async function getAllBranches() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  const branches = await prisma.branch.findMany({
    where: { status: "ACTIVE" },
    select: { name: true },
    orderBy: { name: "asc" }
  });

  return branches.map(b => b.name);
}

export async function getAttendanceReport(employeeCodes?: string[], startDateStr?: string, endDateStr?: string) {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  // Fetch admin names
  const adminUsers = await prisma.user.findMany({
    where: {
      OR: [
        { username: "admin" },
        { role: "Admin" }
      ]
    },
    select: { employeeName: true }
  });
  const adminNames = new Set(
    adminUsers
      .map(u => u.employeeName?.trim().toLowerCase())
      .filter(Boolean)
  );

  // Check if filtering by specific employees
  const hasSelection = employeeCodes && employeeCodes.length > 0;

  // Fetch employees
  const rawEmployees = await prisma.employee.findMany({
    where: hasSelection ? {
      employeeCode: { in: employeeCodes }
    } : {
      status: {
        notIn: ["Nghỉ việc", "INACTIVE"]
      }
    },
    orderBy: { employeeCode: "asc" }
  });

  const employees = rawEmployees.filter(emp => {
    const code = emp.employeeCode;
    const name = emp.fullName.trim().toLowerCase();
    if (code === "NV000") return false;
    if (name.includes("admin")) return false;
    if (adminNames.has(name)) return false;
    return true;
  });

  // Default range if not provided: current month
  let start = startDateStr ? new Date(startDateStr) : new Date();
  let end = endDateStr ? new Date(endDateStr) : new Date();
  
  if (!startDateStr) {
    start.setDate(1); // 1st of current month
  }
  
  // Set times to avoid timezone boundary issues
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  // Fetch checkins for this date range
  const checkins = await prisma.checkin.findMany({
    where: {
      date: {
        gte: start,
        lte: end
      }
    }
  });

  // Fetch approved leave requests overlapping with date range
  const approvedLeaves = await prisma.leaverequest.findMany({
    where: {
      status: {
        in: ["Đã phê duyệt", "Đã duyệt", "Approved", "APPROVED", "Đồng ý", "Chấp nhận"]
      },
      startDate: { lte: end },
      endDate: { gte: start }
    }
  });

  // Fetch user device info
  const users = await prisma.user.findMany({
    select: {
      employeeName: true,
      deviceSecret: true,
      deviceStatus: true,
      pendingDeviceSecret: true
    }
  });

  // Build user device map
  const deviceMap = new Map<string, { secret: string | null; status: string | null; pendingSecret: string | null }>();
  users.forEach(u => {
    if (u.employeeName) {
      deviceMap.set(u.employeeName.trim(), {
        secret: u.deviceSecret,
        status: u.deviceStatus,
        pendingSecret: u.pendingDeviceSecret
      });
    }
  });

  // Generate date array
  const reportData: any[] = [];
  const current = new Date(start);
  const dates: Date[] = [];
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  for (const dateObj of dates) {
    const day = dateObj.getDate();
    const monthVal = dateObj.getMonth() + 1;
    const yearVal = dateObj.getFullYear();
    const dateKeyStr = `${yearVal}-${monthVal.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    for (const emp of employees) {
      // Check if employee has an approved leave request on this date
      const leaveRecord = approvedLeaves.find(l => {
        if (!l.employeeName) return false;
        const matchName = l.employeeName.trim().toLowerCase() === emp.fullName.trim().toLowerCase();
        if (!matchName) return false;

        const lStart = new Date(l.startDate);
        const lEnd = new Date(l.endDate);
        const lStartStr = `${lStart.getFullYear()}-${(lStart.getMonth() + 1).toString().padStart(2, '0')}-${lStart.getDate().toString().padStart(2, '0')}`;
        const lEndStr = `${lEnd.getFullYear()}-${(lEnd.getMonth() + 1).toString().padStart(2, '0')}-${lEnd.getDate().toString().padStart(2, '0')}`;

        return dateKeyStr >= lStartStr && dateKeyStr <= lEndStr;
      });

      // Get device info
      const devInfo = deviceMap.get(emp.fullName.trim());
      let boundDevice = "Chưa liên kết";
      if (devInfo) {
        if (
          devInfo.status === "PENDING" || 
          devInfo.status === "CHỜ DUYỆT" || 
          devInfo.status === "Chờ phê duyệt" ||
          (devInfo.pendingSecret && devInfo.pendingSecret !== devInfo.secret)
        ) {
          boundDevice = "Chờ phê duyệt";
        } else if (devInfo.secret) {
          boundDevice = devInfo.secret.substring(0, 8) + "...";
        }
      }

      let checkInTime = "—";
      let checkOutTime = "—";
      let warning = "Không chấm công";

      if (leaveRecord) {
        checkInTime = "OFF";
        checkOutTime = "OFF";
        const reasonText = leaveRecord.reason 
          ? (leaveRecord.subReason ? `${leaveRecord.reason} (${leaveRecord.subReason})` : leaveRecord.reason)
          : "Nghỉ phép";
        warning = reasonText;
      } else {
        // Find checkin for this employee and this day
        const checkinRecord = checkins.find(c => {
          const cDate = new Date(c.date);
          return c.employeeCode === emp.employeeCode &&
                 cDate.getDate() === day &&
                 cDate.getMonth() === monthVal - 1 &&
                 cDate.getFullYear() === yearVal;
        });

        if (checkinRecord) {
          if (checkinRecord.timeIn) {
            checkInTime = new Date(checkinRecord.timeIn).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
          }
          if (checkinRecord.timeOut) {
            checkOutTime = new Date(checkinRecord.timeOut).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
          }

          if (checkinRecord.timeIn && checkinRecord.timeOut) {
            const hours = (new Date(checkinRecord.timeOut).getTime() - new Date(checkinRecord.timeIn).getTime()) / (1000 * 60 * 60);
            warning = hours >= 8 ? "Đủ giờ công" : "Không đủ giờ công";
          } else if (checkinRecord.timeIn) {
            warning = "Không đủ giờ công";
          }
        }
      }

      reportData.push({
        employeeName: emp.fullName,
        employeeCode: emp.employeeCode,
        date: dateObj,
        dateStr: `${day.toString().padStart(2, '0')}/${monthVal.toString().padStart(2, '0')}/${yearVal}`,
        checkInTime,
        checkOutTime,
        boundDevice,
        warning
      });
    }
  }

  // Sort reportData explicitly: ascending by date first, then by employeeCode
  reportData.sort((a, b) => {
    const dateDiff = a.date.getTime() - b.date.getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.employeeCode.localeCompare(b.employeeCode);
  });

  return reportData;
}

export async function getLeaveReport(employeeCodes?: string[], startDateStr?: string, endDateStr?: string) {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  // Fetch admin names
  const adminUsers = await prisma.user.findMany({
    where: {
      OR: [
        { username: "admin" },
        { role: "Admin" }
      ]
    },
    select: { employeeName: true }
  });
  const adminNames = new Set(
    adminUsers
      .map(u => u.employeeName?.trim().toLowerCase())
      .filter(Boolean)
  );

  let selectedNames: string[] = [];
  const hasSelection = employeeCodes && employeeCodes.length > 0;
  if (hasSelection) {
    const emps = await prisma.employee.findMany({
      where: { employeeCode: { in: employeeCodes } },
      select: { fullName: true }
    });
    selectedNames = emps.map(e => e.fullName);
  }

  const whereClause: any = {};

  if (hasSelection) {
    whereClause.employeeName = {
      in: selectedNames
    };
  }

  if (startDateStr || endDateStr) {
    whereClause.startDate = {};
    if (startDateStr) {
      whereClause.startDate.gte = new Date(startDateStr);
    }
    if (endDateStr) {
      whereClause.startDate.lte = new Date(endDateStr);
    }
  }

  const reports = await prisma.leaverequest.findMany({
    where: whereClause,
    orderBy: { startDate: "desc" }
  });

  const filteredReports = reports.filter(r => {
    const name = r.employeeName.trim().toLowerCase();
    if (name.includes("admin")) return false;
    if (adminNames.has(name)) return false;
    return true;
  });

  return filteredReports.map(r => ({
    ...r,
    startDateStr: new Date(r.startDate).toLocaleDateString("vi-VN"),
    endDateStr: new Date(r.endDate).toLocaleDateString("vi-VN"),
    createdAtStr: new Date(r.createdAt).toLocaleDateString("vi-VN")
  }));
}

export async function getResignationReport(employeeCodes?: string[], startDateStr?: string, endDateStr?: string) {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  // Fetch admin names
  const adminUsers = await prisma.user.findMany({
    where: {
      OR: [
        { username: "admin" },
        { role: "Admin" }
      ]
    },
    select: { employeeName: true }
  });
  const adminNames = new Set(
    adminUsers
      .map(u => u.employeeName?.trim().toLowerCase())
      .filter(Boolean)
  );

  let selectedNames: string[] = [];
  const hasSelection = employeeCodes && employeeCodes.length > 0;
  if (hasSelection) {
    const emps = await prisma.employee.findMany({
      where: { employeeCode: { in: employeeCodes } },
      select: { fullName: true }
    });
    selectedNames = emps.map(e => e.fullName);
  }

  const whereClause: any = {};

  if (hasSelection) {
    whereClause.employeeName = {
      in: selectedNames
    };
  }

  if (startDateStr || endDateStr) {
    whereClause.resignationDate = {};
    if (startDateStr) {
      whereClause.resignationDate.gte = new Date(startDateStr);
    }
    if (endDateStr) {
      whereClause.resignationDate.lte = new Date(endDateStr);
    }
  }

  const reports = await prisma.resignation.findMany({
    where: whereClause,
    orderBy: { resignationDate: "desc" }
  });

  const filteredReports = reports.filter(r => {
    const name = r.employeeName.trim().toLowerCase();
    if (name.includes("admin")) return false;
    if (adminNames.has(name)) return false;
    return true;
  });

  return filteredReports.map(r => ({
    ...r,
    requestDateStr: new Date(r.requestDate).toLocaleDateString("vi-VN"),
    resignationDateStr: new Date(r.resignationDate).toLocaleDateString("vi-VN"),
    createdAtStr: new Date(r.createdAt).toLocaleDateString("vi-VN")
  }));
}
