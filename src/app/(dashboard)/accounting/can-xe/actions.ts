"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getUserModuleBranchFilter } from "@/lib/permissions";

export async function getWeighingSlips() {
  const session = await getSession();
  if (!session) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });
  if (!user) return [];

  // Use branch filter logic
  const filter = await getUserModuleBranchFilter(user.id, "KT_CAN_XE", session.activeBranch, {
    branchField: "branch"
  });

  // If the filter returns no access, return empty list
  if ((filter as any).id === "NO_ACCESS") return [];

  return await prisma.weighingslip.findMany({
    where: filter,
    orderBy: { createdAt: "desc" }
  });
}

export async function getWeighingSlipById(id: string) {
  const session = await getSession();
  if (!session) return null;

  return await prisma.weighingslip.findUnique({
    where: { id }
  });
}

export async function getActiveBranches() {
  return await prisma.branch.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });
}

export async function getProductCategories() {
  return await prisma.productcategory.findMany({
    where: { status: "Hoạt động" },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" }
  });
}

export async function getCustomersAndSuppliers() {
  const [customers, suppliers] = await Promise.all([
    prisma.customer.findMany({
      select: { id: true, name: true, code: true }
    }),
    (prisma as any).supplier.findMany({
      where: { status: "Hoạt động" },
      select: { id: true, name: true, code: true }
    })
  ]);

  const list = [
    ...customers.map(c => ({ id: c.id, name: c.name, code: c.code, type: "Khách hàng" })),
    ...suppliers.map(s => ({ id: s.id, name: s.name, code: s.code, type: "Nhà cung cấp" }))
  ];

  return list.sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export async function generateWeighingSlipNumber(branchName: string) {
  let branchId = 4;
  const lower = branchName.toLowerCase();
  if (lower.includes("đắk lắk")) {
    branchId = 1;
  } else if (lower.includes("đồng tháp")) {
    branchId = 2;
  } else if (lower.includes("hồ chí minh")) {
    branchId = 3;
  }

  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const period = `${yy}${mm}`; // e.g. "2605"
  
  const prefix = `CN${branchId}.${period}/`;

  // Count existing slips for this prefix to generate sequential number
  const count = await prisma.weighingslip.count({
    where: {
      slipNumber: {
        startsWith: prefix
      }
    }
  });

  const nextNum = String(count + 1).padStart(4, "0");
  return `${prefix}${nextNum}`;
}

export async function createWeighingSlip(data: {
  branch: string;
  type: string;
  subType: string;
  licensePlate: string;
  driverName: string;
  productGroup: string;
  customerSupplier: string;
  notes?: string;
  weight1: number;
  weight2: number;
}) {
  const session = await getSession();
  if (!session) throw new Error("Chưa đăng nhập");

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });
  if (!user) throw new Error("Không tìm thấy người dùng");

  const slipNumber = await generateWeighingSlipNumber(data.branch);

  const weight1 = Number(data.weight1) || 0;
  const weight2 = Number(data.weight2) || 0;
  const netWeight = Math.abs(weight1 - weight2);

  const status = weight2 > 0 ? "Đã cân lần 2" : "Đã cân lần 1";

  const newSlip = await prisma.weighingslip.create({
    data: {
      slipNumber,
      branch: data.branch,
      type: data.type,
      subType: data.subType,
      licensePlate: data.licensePlate,
      driverName: data.driverName,
      productGroup: data.productGroup,
      customerSupplier: data.customerSupplier,
      notes: data.notes || "",
      weight1,
      weight2,
      netWeight,
      status
    }
  });

  // Log audit trail
  const changer = user.employeeName || user.username || "Hệ thống";
  await logAudit({
    tableName: "WeighingSlip",
    recordId: newSlip.id,
    action: "CREATE",
    oldData: null,
    newData: newSlip,
    changedBy: changer,
    changeDetail: `Tạo mới phiếu cân ${slipNumber} - Xe ${data.licensePlate} (Cân lần 1: ${weight1} kg)`
  });

  revalidatePath("/accounting/can-xe");
  return newSlip;
}

export async function updateWeighingSlip(
  id: string,
  data: {
    branch?: string;
    type?: string;
    subType?: string;
    licensePlate?: string;
    driverName?: string;
    productGroup?: string;
    customerSupplier?: string;
    notes?: string;
    weight1?: number;
    weight2?: number;
  }
) {
  const session = await getSession();
  if (!session) throw new Error("Chưa đăng nhập");

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });
  if (!user) throw new Error("Không tìm thấy người dùng");

  const oldSlip = await prisma.weighingslip.findUnique({
    where: { id }
  });
  if (!oldSlip) throw new Error("Không tìm thấy phiếu cân");

  const weight1 = data.weight1 !== undefined ? Number(data.weight1) : oldSlip.weight1;
  const weight2 = data.weight2 !== undefined ? Number(data.weight2) : oldSlip.weight2;
  const netWeight = Math.abs(weight1 - weight2);

  const status = weight2 > 0 ? "Đã cân lần 2" : "Đã cân lần 1";

  const updatedSlip = await prisma.weighingslip.update({
    where: { id },
    data: {
      ...data,
      weight1,
      weight2,
      netWeight,
      status
    }
  });

  const changer = user.employeeName || user.username || "Hệ thống";
  await logAudit({
    tableName: "WeighingSlip",
    recordId: id,
    action: "UPDATE",
    oldData: oldSlip,
    newData: updatedSlip,
    changedBy: changer,
    changeDetail: `Cập nhật phiếu cân ${oldSlip.slipNumber} (Cân lần 1: ${weight1} kg, Cân lần 2: ${weight2} kg, TL: ${netWeight} kg)`
  });

  revalidatePath("/accounting/can-xe");
  return updatedSlip;
}

export async function deleteWeighingSlip(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Chưa đăng nhập");

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });
  if (!user) throw new Error("Không tìm thấy người dùng");

  const oldSlip = await prisma.weighingslip.findUnique({
    where: { id }
  });
  if (!oldSlip) throw new Error("Không tìm thấy phiếu cân");

  await prisma.weighingslip.delete({
    where: { id }
  });

  const changer = user.employeeName || user.username || "Hệ thống";
  await logAudit({
    tableName: "WeighingSlip",
    recordId: id,
    action: "DELETE",
    oldData: oldSlip,
    newData: null,
    changedBy: changer,
    changeDetail: `Xóa phiếu cân ${oldSlip.slipNumber} - Xe ${oldSlip.licensePlate}`
  });

  revalidatePath("/accounting/can-xe");
  return { success: true };
}

export async function seedMockWeighingSlips() {
  const count = await prisma.weighingslip.count();
  if (count > 0) return { seeded: false };

  const mockSlips = [
    {
      slipNumber: "CN2.2605/0402",
      branch: "Đồng Tháp",
      type: "Nhập hàng",
      subType: "Nhập nguyên liệu",
      licensePlate: "64H02338",
      driverName: "Nguyễn Thái Sĩ",
      productGroup: "Xoài",
      customerSupplier: "Nguyễn Thái Sĩ",
      notes: "Cân dừa trái nhập kho",
      weight1: 26.190,
      weight2: 0,
      netWeight: 0,
      status: "Đã cân lần 1",
      createdAt: new Date("2026-05-31T09:42:00Z")
    },
    {
      slipNumber: "CN2.2605/0401",
      branch: "Đồng Tháp",
      type: "Nhập hàng",
      subType: "Nhập nguyên liệu",
      licensePlate: "67H00597",
      driverName: "Mai Kim Nho",
      productGroup: "Xoài",
      customerSupplier: "Mai Kim Nho",
      notes: "",
      weight1: 19.600,
      weight2: 0,
      netWeight: 0,
      status: "Đã cân lần 1",
      createdAt: new Date("2026-05-31T09:40:00Z")
    },
    {
      slipNumber: "CN2.2605/0400",
      branch: "Đồng Tháp",
      type: "Nhập hàng",
      subType: "Nhập nguyên liệu",
      licensePlate: "66H03397",
      driverName: "Mai Kim Nho",
      productGroup: "Xoài",
      customerSupplier: "Mai Kim Nho",
      notes: "",
      weight1: 21.000,
      weight2: 7.200,
      netWeight: 13.800,
      status: "Đã cân lần 2",
      createdAt: new Date("2026-05-31T09:35:00Z")
    },
    {
      slipNumber: "CN2.2605/0399",
      branch: "Đồng Tháp",
      type: "Nhập hàng",
      subType: "Nhập nguyên liệu",
      licensePlate: "63H05452",
      driverName: "Mai Kim Nho",
      productGroup: "Xoài",
      customerSupplier: "Mai Kim Nho",
      notes: "",
      weight1: 17.990,
      weight2: 5.810,
      netWeight: 12.180,
      status: "Đã cân lần 2",
      createdAt: new Date("2026-05-31T09:30:00Z")
    },
    {
      slipNumber: "CN2.2605/0398",
      branch: "Đồng Tháp",
      type: "Nhập hàng",
      subType: "Nhập nguyên liệu",
      licensePlate: "66F00583",
      driverName: "Lê Văn Tám",
      productGroup: "Xoài",
      customerSupplier: "NCC - Tân Phương Đông",
      notes: "",
      weight1: 27.310,
      weight2: 12.840,
      netWeight: 14.470,
      status: "Đã cân lần 2",
      createdAt: new Date("2026-05-31T09:25:00Z")
    },
    {
      slipNumber: "CN2.2605/0397",
      branch: "Đồng Tháp",
      type: "Xuất hàng",
      subType: "Xuất thành phẩm",
      licensePlate: "61H3255",
      driverName: "Trần Minh Tâm",
      productGroup: "Xoài",
      customerSupplier: "Kho lạnh Toàn Phát",
      notes: "Xuất xoài cát chu đóng hộp",
      weight1: 13.040,
      weight2: 30.740,
      netWeight: 17.700,
      status: "Đã cân lần 2",
      createdAt: new Date("2026-05-30T10:15:00Z")
    },
    {
      slipNumber: "CN1.2605/0084",
      branch: "Đắk Lắk",
      type: "Nhập hàng",
      subType: "Nhập nguyên liệu",
      licensePlate: "77H09875",
      driverName: "Nguyễn Mạnh Cần",
      productGroup: "Dừa",
      customerSupplier: "Nguyễn Mạnh Cần",
      notes: "",
      weight1: 16.920,
      weight2: 0,
      netWeight: 0,
      status: "Đã cân lần 1",
      createdAt: new Date("2026-05-30T09:12:00Z")
    }
  ];

  await prisma.weighingslip.createMany({
    data: mockSlips
  });

  revalidatePath("/accounting/can-xe");
  return { seeded: true };
}

