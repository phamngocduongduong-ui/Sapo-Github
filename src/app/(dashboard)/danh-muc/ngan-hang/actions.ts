"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

async function createAuditLog(tableName: string, recordId: string, action: string, oldData: any, newData: any, changeDetail: string) {
  const session = await getSession();
  const username = session?.username || "Unknown";
  await (prisma as any).auditlog.create({
    data: {
      tableName,
      recordId,
      action,
      oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
      newData: newData ? JSON.parse(JSON.stringify(newData)) : null,
      changedBy: username,
      changeDetail,
    },
  });
}

export async function getBanks() {
  return await prisma.bank.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createBank(formData: FormData) {
  const code = formData.get("code") as string;
  const bankAccount = formData.get("bankAccount") as string;
  const bankName = formData.get("bankName") as string;
  const bankAddress = formData.get("bankAddress") as string;
  const beneficiaryName = formData.get("beneficiaryName") as string;
  const swiftCode = formData.get("swiftCode") as string;
  const beneficiaryAddress = formData.get("beneficiaryAddress") as string;
  const status = formData.get("status") as string || "Hoạt động";
  const note = formData.get("note") as string;

  if (!code || !bankAccount || !bankName || !bankAddress || !beneficiaryName || !swiftCode || !beneficiaryAddress) {
    throw new Error("Vui lòng điền đầy đủ các thông tin bắt buộc.");
  }

  const bankRecord = await prisma.bank.create({
    data: {
      id: crypto.randomUUID(),
      code,
      bankAccount,
      bankName,
      bankAddress,
      beneficiaryName,
      swiftCode,
      beneficiaryAddress,
      status,
      note
    },
  });

  await createAuditLog("Bank", bankRecord.id, "CREATE", null, bankRecord, `Thêm mới tài khoản ngân hàng: ${bankName} - ${bankAccount}`);
  revalidatePath("/danh-muc/ngan-hang");
  return bankRecord;
}

export async function updateBank(id: string, formData: FormData) {
  const oldBank = await prisma.bank.findUnique({ where: { id } });
  
  const code = formData.get("code") as string;
  const bankAccount = formData.get("bankAccount") as string;
  const bankName = formData.get("bankName") as string;
  const bankAddress = formData.get("bankAddress") as string;
  const beneficiaryName = formData.get("beneficiaryName") as string;
  const swiftCode = formData.get("swiftCode") as string;
  const beneficiaryAddress = formData.get("beneficiaryAddress") as string;
  const status = formData.get("status") as string || "Hoạt động";
  const note = formData.get("note") as string;

  if (!code || !bankAccount || !bankName || !bankAddress || !beneficiaryName || !swiftCode || !beneficiaryAddress) {
    throw new Error("Vui lòng điền đầy đủ các thông tin bắt buộc.");
  }

  const bankRecord = await prisma.bank.update({
    where: { id },
    data: {
      code,
      bankAccount,
      bankName,
      bankAddress,
      beneficiaryName,
      swiftCode,
      beneficiaryAddress,
      status,
      note
    },
  });

  await createAuditLog("Bank", id, "UPDATE", oldBank, bankRecord, `Cập nhật tài khoản ngân hàng: ${bankName} - ${bankAccount}`);
  revalidatePath("/danh-muc/ngan-hang");
  return bankRecord;
}

export async function updateBankStatus(id: string, status: string) {
  const oldBank = await prisma.bank.findUnique({ where: { id } });
  const bankRecord = await prisma.bank.update({
    where: { id },
    data: { status },
  });

  await createAuditLog("Bank", id, "STATUS_CHANGE", oldBank, bankRecord, `Thay đổi trạng thái tài khoản ngân hàng sang: ${status}`);
  revalidatePath("/danh-muc/ngan-hang");
  return bankRecord;
}

export async function deleteBank(id: string) {
  const oldBank = await prisma.bank.findUnique({ where: { id } });
  await prisma.bank.delete({ where: { id } });

  await createAuditLog("Bank", id, "DELETE", oldBank, null, `Xóa tài khoản ngân hàng: ${oldBank?.bankName} - ${oldBank?.bankAccount}`);
  revalidatePath("/danh-muc/ngan-hang");
}
