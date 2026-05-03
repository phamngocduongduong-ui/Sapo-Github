"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

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

  const existing = await prisma.order.findUnique({ where: { orderCode } });
  if (existing) throw new Error("Mã đơn hàng đã tồn tại.");

  const order = await prisma.order.create({
    data: {
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
          id: require('crypto').randomUUID(),
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

  // Xóa orderitem cũ và tạo mới
  await (prisma as any).orderitem.deleteMany({ where: { orderId: id } });

  const session = await getSession();
  const oldOrder = await (prisma as any).order.findUnique({ where: { id }, include: { orderitem: true } });

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
          id: require('crypto').randomUUID(),
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
  const oldOrder = await prisma.order.findUnique({ where: { id } });

  await prisma.order.update({
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
  await prisma.order.delete({ where: { id } });
  revalidatePath("/sales/don-hang");
}
