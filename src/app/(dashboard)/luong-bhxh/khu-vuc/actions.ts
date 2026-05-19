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
  
  revalidatePath("/luong-bhxh/khu-vuc");
}

export async function deleteCheckInArea(id: string) {
  await prisma.checkin_area.delete({
    where: { id }
  });
  revalidatePath("/luong-bhxh/khu-vuc");
}
