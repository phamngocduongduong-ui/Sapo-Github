"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function createDispatchOrder(formData: FormData) {
  const dispatchDate = formData.get("dispatchDate") as string;
  const expectedDate = formData.get("expectedDate") as string;
  const employeeName = formData.get("employeeName") as string;
  const status = formData.get("status") as string;
  const dispatcher = formData.get("dispatcher") as string;
  const note = formData.get("note") as string;

  if (!dispatchDate || !expectedDate || !employeeName || !dispatcher) {
    throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc.");
  }

  const dispatch = await (prisma as any).dispatchorder.create({
    data: {
      id: crypto.randomUUID(),
      dispatchDate: new Date(dispatchDate),
      expectedDate: new Date(expectedDate),
      employeeName,
      status: status || "PENDING",
      dispatcher,
      origin: "",
      destination: "",
      note: note || null,
    },
  });

  const session = await getSession();
  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "DispatchOrder",
    recordId: dispatch.id,
    action: "CREATE",
    newData: dispatch,
    changedBy,
    changeDetail: `Tạo lệnh điều động cho nhân viên: ${employeeName}`
  });

  revalidatePath("/purchasing/dispatch");
}

export async function updateDispatchOrder(id: string, formData: FormData) {
  const dispatchDate = formData.get("dispatchDate") as string;
  const expectedDate = formData.get("expectedDate") as string;
  const employeeName = formData.get("employeeName") as string;
  const status = formData.get("status") as string;
  const dispatcher = formData.get("dispatcher") as string;
  const note = formData.get("note") as string;

  if (!dispatchDate || !expectedDate || !employeeName || !dispatcher) {
    throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc.");
  }

  const session = await getSession();
  const oldDispatch = await (prisma as any).dispatchorder.findUnique({ where: { id } });

  const updatedDispatch = await (prisma as any).dispatchorder.update({
    where: { id },
    data: {
      dispatchDate: new Date(dispatchDate),
      expectedDate: new Date(expectedDate),
      employeeName,
      status: status || "PENDING",
      dispatcher,
      note: note || null,
    },
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "DispatchOrder",
    recordId: id,
    action: "UPDATE",
    oldData: oldDispatch,
    newData: updatedDispatch,
    changedBy,
    changeDetail: "Cập nhật thông tin lệnh điều động"
  });

  revalidatePath("/purchasing/dispatch");
}

export async function updateDispatchStatus(id: string, status: string) {
  const session = await getSession();
  const oldDispatch = await (prisma as any).dispatchorder.findUnique({ where: { id } });

  await (prisma as any).dispatchorder.update({
    where: { id },
    data: { status },
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "DispatchOrder",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldDispatch?.status },
    newData: { status },
    changedBy,
    changeDetail: `Chuyển trạng thái lệnh điều động sang: ${status}`
  });
  revalidatePath("/purchasing/dispatch");
}
