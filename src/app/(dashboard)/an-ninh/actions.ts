"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createRegistration(data: any) {
  try {
    const created = await (prisma as any).securityregistration.create({
      data: {
        licensePlate: data.licensePlate,
        driverName: data.driverName,
        idCardNumber: data.idCardNumber,
        phoneNumber: data.phoneNumber,
        unit: data.unit,
        purpose: data.purpose,
        status: "Đã đăng ký",
        timeIn: new Date(),
        note: data.note,
        creator: data.creator,
      },
    });
    revalidatePath("/an-ninh/dang-ky");
    revalidatePath("/an-ninh/danh-sach");
    return { success: true, id: created.id };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Lỗi khi tạo đăng ký" };
  }
}

export async function updateRegistration(id: string, data: any) {
  try {
    await (prisma as any).securityregistration.update({
      where: { id },
      data: {
        licensePlate: data.licensePlate,
        driverName: data.driverName,
        idCardNumber: data.idCardNumber,
        phoneNumber: data.phoneNumber,
        unit: data.unit,
        purpose: data.purpose,
        note: data.note,
      },
    });
    revalidatePath("/an-ninh/dang-ky");
    revalidatePath("/an-ninh/danh-sach");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Lỗi khi cập nhật" };
  }
}

export async function deleteRegistration(id: string) {
  try {
    await (prisma as any).securityregistration.delete({
      where: { id },
    });
    revalidatePath("/an-ninh/dang-ky");
    revalidatePath("/an-ninh/danh-sach");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Lỗi khi xóa" };
  }
}

export async function confirmExit(id: string) {
  try {
    await (prisma as any).securityregistration.update({
      where: { id },
      data: {
        status: "Đã hoàn thành",
        timeOut: new Date(),
      },
    });
    revalidatePath("/an-ninh/dang-ky");
    revalidatePath("/an-ninh/danh-sach");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Lỗi khi xác nhận ra" };
  }
}

export async function confirmEntry(id: string) {
  try {
    await (prisma as any).securityregistration.update({
      where: { id },
      data: {
        status: "Đã vào cổng",
        timeIn: new Date(),
      },
    });
    revalidatePath("/an-ninh/dang-ky");
    revalidatePath("/an-ninh/danh-sach");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Lỗi khi xác nhận xe vào" };
  }
}

export async function undoStatus(id: string) {
  try {
    await (prisma as any).securityregistration.update({
      where: { id },
      data: {
        status: "Đã đăng ký",
        timeOut: null,
      },
    });
    revalidatePath("/an-ninh/dang-ky");
    revalidatePath("/an-ninh/danh-sach");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Lỗi khi hoàn tác" };
  }
}

export async function getRegistrations() {
  try {
    const data = await (prisma as any).securityregistration.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function verifyEmployee(code: string) {
  try {
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { employeeCode: code },
          { cardCode: code }
        ]
      }
    });
    return employee;
  } catch (error) {
    console.error(error);
    return null;
  }
}
