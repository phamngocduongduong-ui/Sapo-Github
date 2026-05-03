"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createBranch(formData: FormData) {
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const status = formData.get("status") as string;

  if (!code || !name) throw new Error("Mã và tên chi nhánh là bắt buộc.");

  await prisma.branch.create({
    data: { code, name, address: address || null, status: status || "ACTIVE" },
  });

  await syncAdminBranches();

  revalidatePath("/danh-muc/chi-nhanh");
}

export async function updateBranch(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const status = formData.get("status") as string;

  if (!name) throw new Error("Tên chi nhánh là bắt buộc.");

  await prisma.branch.update({
    where: { id },
    data: { name, address: address || null, status },
  });

  await syncAdminBranches();

  revalidatePath("/danh-muc/chi-nhanh");
}

async function syncAdminBranches() {
  const allBranches = await prisma.branch.findMany({
    where: { status: "ACTIVE" },
    select: { name: true }
  });
  const branchNames = allBranches.map(b => b.name).join(",");
  
  await prisma.user.updateMany({
    where: { username: "admin" },
    data: { branch: branchNames }
  });
}
