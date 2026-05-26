"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getCheckInAreas() {
  return await prisma.checkin_area.findMany({
    orderBy: { createdAt: "desc" }
  });
}

export async function upsertCheckInArea(data: any) {
  const { id, ...rest } = data;
  
  if (id) {
    await prisma.checkin_area.update({
      where: { id },
      data: {
        ...rest,
        latitude: parseFloat(rest.latitude),
        longitude: parseFloat(rest.longitude),
        radius: parseInt(rest.radius)
      }
    });
  } else {
    await prisma.checkin_area.create({
      data: {
        ...rest,
        latitude: parseFloat(rest.latitude),
        longitude: parseFloat(rest.longitude),
        radius: parseInt(rest.radius)
      }
    });
  }
  
  revalidatePath("/danh-muc/dia-diem-cham-cong");
}

export async function deleteCheckInArea(id: string) {
  try {
    const checkinCount = await prisma.checkin.count({
      where: { areaId: id }
    });

    if (checkinCount > 0) {
      return { success: false, error: "Địa điểm này đã phát sinh dữ liệu chấm công của nhân viên, không thể xóa!" };
    }

    await prisma.checkin_area.delete({
      where: { id }
    });
    revalidatePath("/danh-muc/dia-diem-cham-cong");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Có lỗi xảy ra khi xóa." };
  }
}
