"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getSalaryLevels() {
  return await prisma.salaryLevel.findMany({
    orderBy: { stt: "asc" }
  });
}

export async function createSalaryLevel(data: any) {
  const result = await prisma.salaryLevel.create({
    data: {
      stt: parseInt(data.stt),
      levelCode: data.levelCode,
      baseSalary: parseFloat(data.baseSalary),
      attendanceBonus: parseFloat(data.attendanceBonus || 0),
      performanceBonus: parseFloat(data.performanceBonus || 0),
      responsibilityBonus: parseFloat(data.responsibilityBonus || 0),
    },
  });
  revalidatePath("/nhan-su/bac-luong");
  return result;
}

export async function updateSalaryLevel(id: string, data: any) {
  const result = await prisma.salaryLevel.update({
    where: { id },
    data: {
      stt: parseInt(data.stt),
      levelCode: data.levelCode,
      baseSalary: parseFloat(data.baseSalary),
      attendanceBonus: parseFloat(data.attendanceBonus || 0),
      performanceBonus: parseFloat(data.performanceBonus || 0),
      responsibilityBonus: parseFloat(data.responsibilityBonus || 0),
    },
  });
  revalidatePath("/nhan-su/bac-luong");
  return result;
}

export async function deleteSalaryLevel(id: string) {
  const result = await prisma.salaryLevel.delete({
    where: { id },
  });
  revalidatePath("/nhan-su/bac-luong");
  return result;
}

export async function importSalaryLevels(dataList: any[]) {
  // Use transaction to delete all and create new
  const result = await prisma.$transaction([
    prisma.salaryLevel.deleteMany({}),
    prisma.salaryLevel.createMany({
      data: dataList
    })
  ]);
  revalidatePath("/nhan-su/bac-luong");
  return result;
}
