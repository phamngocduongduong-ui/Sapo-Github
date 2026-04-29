// // "use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

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

  await prisma.dispatchOrder.create({
    data: {
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

  await prisma.dispatchOrder.update({
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

  revalidatePath("/purchasing/dispatch");
}

export async function updateDispatchStatus(id: string, status: string) {
  await prisma.dispatchOrder.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/purchasing/dispatch");
}
