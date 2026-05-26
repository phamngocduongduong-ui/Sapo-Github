"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function acceptOrder(id: string) {
  const session = await getSession();
  const oldOrder = await (prisma as any).order.findUnique({ where: { id } });

  if (!oldOrder) throw new Error("Đơn hàng không tồn tại.");
  if (oldOrder.status !== "Chờ tiếp nhận") {
    throw new Error("Chỉ có thể tiếp nhận đơn hàng đang ở trạng thái 'Chờ tiếp nhận'.");
  }

  const updated = await (prisma as any).order.update({
    where: { id },
    data: { status: "Chờ kế hoạch" }
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "Order",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldOrder.status },
    newData: { status: "Chờ kế hoạch" },
    changedBy,
    changeDetail: `Tiếp nhận đơn hàng ${oldOrder.orderCode}, chuyển sang Chờ kế hoạch`
  });

  revalidatePath("/production/don-san-xuat");
  revalidatePath("/production/ke-hoach-giao");
  revalidatePath("/production/ke-hoach-vat-tu");
  return { success: true };
}

export async function planOrder(id: string, shipDateStr: string) {
  const session = await getSession();
  const oldOrder = await (prisma as any).order.findUnique({ where: { id } });

  if (!oldOrder) throw new Error("Đơn hàng không tồn tại.");
  
  const shipDate = new Date(shipDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(shipDate);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate < today) {
    throw new Error("Không thể lập kế hoạch hoặc dời lịch xuất hàng vào ngày trong quá khứ.");
  }

  const updated = await (prisma as any).order.update({
    where: { id },
    data: { 
      status: "Chờ giao hàng",
      shipDate: shipDate
    }
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "Order",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldOrder.status, shipDate: oldOrder.shipDate },
    newData: { status: "Chờ giao hàng", shipDate },
    changedBy,
    changeDetail: `Lập lịch xuất hàng cho đơn ${oldOrder.orderCode} vào ngày ${shipDateStr}`
  });

  revalidatePath("/production/don-san-xuat");
  revalidatePath("/production/ke-hoach-giao");
  revalidatePath("/production/ke-hoach-vat-tu");
  return { success: true };
}

export async function unplanOrder(id: string) {
  const session = await getSession();
  const oldOrder = await (prisma as any).order.findUnique({ where: { id } });

  if (!oldOrder) throw new Error("Đơn hàng không tồn tại.");

  const updated = await (prisma as any).order.update({
    where: { id },
    data: { 
      status: "Chờ kế hoạch",
      shipDate: null
    }
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "Order",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldOrder.status, shipDate: oldOrder.shipDate },
    newData: { status: "Chờ kế hoạch", shipDate: null },
    changedBy,
    changeDetail: `Hủy lập lịch xuất hàng cho đơn ${oldOrder.orderCode}, trả về Chờ kế hoạch`
  });

  revalidatePath("/production/don-san-xuat");
  revalidatePath("/production/ke-hoach-giao");
  revalidatePath("/production/ke-hoach-vat-tu");
  return { success: true };
}

export async function cancelAcceptOrder(id: string) {
  const session = await getSession();
  const oldOrder = await (prisma as any).order.findUnique({ where: { id } });

  if (!oldOrder) throw new Error("Đơn hàng không tồn tại.");
  if (oldOrder.status !== "Chờ kế hoạch") {
    throw new Error("Chỉ có thể hủy tiếp nhận đơn hàng đang ở trạng thái 'Chờ kế hoạch'.");
  }

  const updated = await (prisma as any).order.update({
    where: { id },
    data: { status: "Chờ tiếp nhận" }
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "Order",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldOrder.status },
    newData: { status: "Chờ tiếp nhận" },
    changedBy,
    changeDetail: `Hủy tiếp nhận đơn hàng ${oldOrder.orderCode}, trả về Chờ tiếp nhận`
  });

  revalidatePath("/production/don-san-xuat");
  revalidatePath("/production/ke-hoach-giao");
  revalidatePath("/production/ke-hoach-vat-tu");
  return { success: true };
}
