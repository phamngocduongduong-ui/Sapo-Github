// "use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

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

  await prisma.order.create({
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
      items: {
        create: items.map(item => ({
          productName: item.productName,
          packaging: item.packaging,
          quantity: parseInt(item.quantity) || 0,
          hasPallet: item.hasPallet,
          hasCornerGuard: item.hasCornerGuard,
          note: item.note
        }))
      }
    },
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

  // Xóa items cũ và tạo mới (đơn giản nhất cho logic update nested)
  await prisma.orderItem.deleteMany({ where: { orderId: id } });

  await prisma.order.update({
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
      items: {
        create: items.map(item => ({
          productName: item.productName,
          packaging: item.packaging,
          quantity: parseInt(item.quantity) || 0,
          hasPallet: item.hasPallet,
          hasCornerGuard: item.hasCornerGuard,
          note: item.note
        }))
      }
    }
  });

  revalidatePath("/sales/don-hang");
}

export async function approveOrder(id: string) {
  await prisma.order.update({
    where: { id },
    data: { status: "Chờ kế hoạch sản xuất" }
  });
  revalidatePath("/sales/don-hang");
}

export async function deleteOrder(id: string) {
  await prisma.order.delete({ where: { id } });
  revalidatePath("/sales/don-hang");
}
