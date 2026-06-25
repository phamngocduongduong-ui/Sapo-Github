import { prisma } from "./db";

export interface UserPermission {
  canAccess: boolean;
  allBranches: boolean;
}

/**
 * Get access permission and branch permission of a user for a specific module.
 */
export async function getUserPermission(userId: string, moduleKey: string): Promise<UserPermission> {
  const user = await (prisma as any).user.findUnique({
    where: { id: userId },
    include: {
      permission: {
        include: {
          permissiondetail: {
            where: { moduleKey }
          }
        }
      }
    }
  });

  if (!user) {
    return { canAccess: false, allBranches: false };
  }

  // Admin (username admin or role Admin) has absolute power
  const isAdmin = user.username === "admin" || user.role === "Admin";
  if (isAdmin) {
    return { canAccess: true, allBranches: true };
  }

  let canAccess = false;
  let allBranches = false;

  user.permission?.forEach((p: any) => {
    p.permissiondetail?.forEach((d: any) => {
      if (d.canAccess) {
        canAccess = true;
      }
      if (d.allBranches) {
        allBranches = true;
      }
    });
  });

  return { canAccess, allBranches };
}

interface FilterOptions {
  branchField?: string;
  creatorField?: string;
  employeeField?: string;
  employeeInBranchField?: string;
}

/**
 * Build dynamic Prisma where filter based on branch permissions, active branch, and staff level (Staff vs Manager).
 */
export async function getUserModuleBranchFilter(
  userId: string,
  moduleKey: string,
  activeBranch: string | null | undefined,
  fields: FilterOptions = {}
) {
  const user = await (prisma as any).user.findUnique({
    where: { id: userId }
  });
  if (!user) return { id: "NO_ACCESS" };

  const isAdmin = user.username === "admin" || user.role === "Admin";
  if (isAdmin) return {};

  const { canAccess, allBranches } = await getUserPermission(userId, moduleKey);
  if (!canAccess) return { id: "NO_ACCESS" };

  // If the user has permission to see all branches, return no branch filter (empty object).
  // But if the user is regular staff, we might still want to restrict them to their own records regardless of branch?
  // Let's check: "Tùy theo cấp nhân viên hay trưởng phòng trở lên mà có thể thấy được dữ liệu của mình tạo ra hoặc tất cả dữ liệu của chi nhánh đó."
  // Wait! If "Tất cả chi nhánh" is CLICKED: they can see all branches' data. But does a staff member still see only their own data or all data across all branches?
  // User says: "Tôi muốn nếu click cột này thì phân đó người dùng có thể thấy tất cả dòng dữ liệu của các chi nhánh thay vì chi nhánh của người dùng đang hoạt động. Nếu không click vào thì nghĩa là người dùng chỉ thấy được trong phạm vi chi nhánh đó."
  // This implies that if "Tất cả chi nhánh" IS clicked, they can see ALL rows of ALL branches. So they can see everything (similar to manager or admin).
  // Wait, let's keep it simple: if allBranches is true, they see everything from all branches. If allBranches is false, they are limited to the active branch, and staff are further limited to their own records.
  
  if (allBranches) return {};

  // Find the branch to filter
  const branchToFilter = activeBranch || user.branch?.split(",")[0]?.trim() || "";

  // Evaluate Manager vs Staff
  let position = "";
  if (user.employeeName) {
    const latestTransfer = await (prisma as any).transferpromotion.findFirst({
      where: {
        employeeName: user.employeeName,
        status: "Đã phê duyệt"
      },
      orderBy: { createdAt: "desc" }
    });
    if (latestTransfer) {
      position = latestTransfer.newPosition || "";
    } else {
      const employee = await prisma.employee.findFirst({
        where: { fullName: user.employeeName }
      });
      position = employee?.position || "";
    }
  }

  const isManager = user.role?.includes("Trưởng phòng") || 
                    position.toLowerCase().includes("trưởng phòng") || 
                    position.toLowerCase().includes("giám đốc");
  const isStaff = !isManager;

  const conditions: any[] = [];

  // 1. Branch/Location filter
  if (branchToFilter) {
    if (fields.branchField) {
      conditions.push({ [fields.branchField]: branchToFilter });
    } else if (fields.employeeInBranchField) {
      // Find employees belonging to the filtered branch
      const employeesInBranch = await prisma.employee.findMany({
        where: { branch: branchToFilter },
        select: { fullName: true }
      });
      const employeeNames = employeesInBranch.map(e => e.fullName);
      conditions.push({ [fields.employeeInBranchField]: { in: employeeNames } });
    }
  }

  // 2. Creator / Employee ownership filter (Only for staff)
  if (isStaff) {
    const userName = user.employeeName || user.username || "";
    const ownershipConditions: any[] = [];
    if (fields.creatorField) {
      ownershipConditions.push({ [fields.creatorField]: userName });
    }
    if (fields.employeeField) {
      ownershipConditions.push({ [fields.employeeField]: userName });
    }
    if (ownershipConditions.length > 0) {
      conditions.push({ OR: ownershipConditions });
    }
  }

  if (conditions.length === 0) return {};
  if (conditions.length === 1) return conditions[0];
  
  // Combine conditions using AND
  // If there's already an OR inside it (ownership filter), we want it to be (branch condition AND (own_creator OR own_employee))
  return { AND: conditions };
}
