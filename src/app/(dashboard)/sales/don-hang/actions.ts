"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import crypto from "crypto";

export async function createOrder(formData: FormData, items: any[]) {
  const orderCode = formData.get("orderCode") as string;
  const customerCode = formData.get("customerCode") as string;
  const employeeName = formData.get("employeeName") as string;
  const branch = formData.get("branch") as string;
  const requestDeliveryDate = formData.get("requestDeliveryDate") as string;
  const productionFinishDate = formData.get("productionFinishDate") as string;
  const shipDate = formData.get("shipDate") as string;
  const thermometer = formData.get("thermometer") === "on";
  const note = formData.get("note") as string;

  if (!orderCode || !customerCode) throw new Error("Mã đơn hàng và Mã khách hàng là bắt buộc.");

  const existing = await (prisma as any).order.findUnique({ where: { orderCode } });
  if (existing) throw new Error("Mã đơn hàng đã tồn tại.");

  const order = await (prisma as any).order.create({
    data: {
      id: crypto.randomUUID(),
      orderCode,
      customerCode,
      employeeName,
      branch: branch || null,
      requestDeliveryDate: requestDeliveryDate ? new Date(requestDeliveryDate) : null,
      productionFinishDate: productionFinishDate ? new Date(productionFinishDate) : null,
      shipDate: shipDate ? new Date(shipDate) : null,
      thermometer,
      status: "Tạo mới",
      note: note || null,
      orderitem: {
        create: items.map(item => ({
          id: crypto.randomUUID(),
          productName: item.productName,
          packaging: item.packaging,
          quantity: parseInt(item.quantity) || 0,
          hasPallet: item.hasPallet,
          hasCornerGuard: item.hasCornerGuard,
          note: item.note,
          updatedAt: new Date()
        }))
      }
    },
  });

  const session = await getSession();
  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "Order",
    recordId: order.id,
    action: "CREATE",
    newData: order,
    changedBy,
    changeDetail: `Tạo đơn hàng mới: ${orderCode}`
  });

  revalidatePath("/sales/don-hang");
}

export async function updateOrder(id: string, formData: FormData, items: any[]) {
  const customerCode = formData.get("customerCode") as string;
  const branch = formData.get("branch") as string;
  const requestDeliveryDate = formData.get("requestDeliveryDate") as string;
  const productionFinishDate = formData.get("productionFinishDate") as string;
  const shipDate = formData.get("shipDate") as string;
  const thermometer = formData.get("thermometer") === "on";
  const note = formData.get("note") as string;
  const status = formData.get("status") as string;

  const session = await getSession();
  const oldOrder = await (prisma as any).order.findUnique({ where: { id }, include: { orderitem: true } });

  if (!oldOrder) throw new Error("Đơn hàng không tồn tại.");
  if (oldOrder.status !== "Tạo mới") {
    throw new Error(`Không thể chỉnh sửa đơn hàng đang ở trạng thái "${oldOrder.status}".`);
  }

  // Xóa orderitem cũ và tạo mới
  await (prisma as any).orderitem.deleteMany({ where: { orderId: id } });

  const updatedOrder = await (prisma as any).order.update({
    where: { id },
    data: {
      customerCode,
      branch: branch || null,
      requestDeliveryDate: requestDeliveryDate ? new Date(requestDeliveryDate) : null,
      productionFinishDate: productionFinishDate ? new Date(productionFinishDate) : null,
      shipDate: shipDate ? new Date(shipDate) : null,
      thermometer,
      status,
      note: note || null,
      orderitem: {
        create: items.map(item => ({
          id: crypto.randomUUID(),
          productName: item.productName,
          packaging: item.packaging,
          quantity: parseInt(item.quantity) || 0,
          hasPallet: item.hasPallet,
          hasCornerGuard: item.hasCornerGuard,
          note: item.note,
          updatedAt: new Date()
        }))
      }
    },
    include: { orderitem: true }
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "Order",
    recordId: id,
    action: "UPDATE",
    oldData: oldOrder,
    newData: updatedOrder,
    changedBy,
    changeDetail: oldOrder?.status !== status ? `Cập nhật đơn hàng (Chuyển trạng thái sang: ${status})` : "Cập nhật thông tin đơn hàng"
  });

  revalidatePath("/sales/don-hang");
}

export async function approveOrder(id: string) {
  const session = await getSession();
  const oldOrder = await (prisma as any).order.findUnique({ where: { id } });

  await (prisma as any).order.update({
    where: { id },
    data: { status: "Chờ kế hoạch sản xuất" }
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "Order",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldOrder?.status },
    newData: { status: "Chờ kế hoạch sản xuất" },
    changedBy,
    changeDetail: "Phê duyệt đơn hàng, chuyển sang Chờ kế hoạch sản xuất"
  });
  revalidatePath("/sales/don-hang");
}

export async function deleteOrder(id: string) {
  const order = await (prisma as any).order.findUnique({ where: { id } });
  if (order?.status !== "Tạo mới" && order?.status !== "Đã hủy") {
    throw new Error("Không thể xóa đơn hàng đã được phê duyệt hoặc đang xử lý.");
  }
  await (prisma as any).order.delete({ where: { id } });
  revalidatePath("/sales/don-hang");
}

export async function updateOrderStatus(id: string, status: string) {
  const session = await getSession();
  const oldOrder = await (prisma as any).order.findUnique({ where: { id } });

  const updatedOrder = await (prisma as any).order.update({
    where: { id },
    data: { status }
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "Order",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldOrder?.status },
    newData: { status },
    changedBy,
    changeDetail: `Chuyển trạng thái đơn hàng sang: ${status}`
  });
  revalidatePath("/sales/don-hang");
}
