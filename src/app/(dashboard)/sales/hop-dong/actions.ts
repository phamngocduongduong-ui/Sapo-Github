"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import crypto from "crypto";

// Helper to sanitize numeric strings (remove commas, dollar signs, spaces)
function sanitizeNumber(val: any): number {
  if (val === undefined || val === null) return 0;
  const str = String(val).replace(/[^0-9.-]/g, "");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export async function createContract(formData: FormData, items: any[]) {
  const contractNumber = formData.get("contractNumber") as string;
  const contractDateStr = formData.get("contractDate") as string;
  const seller = formData.get("seller") as string;
  const buyer = formData.get("buyer") as string;
  const deliveryDate = formData.get("deliveryDate") as string; // text free-text
  const portOfLoading = formData.get("portOfLoading") as string;
  const portOfDischarge = formData.get("portOfDischarge") as string;
  const deliveryTerms = formData.get("deliveryTerms") as string;
  const paymentMethod = formData.get("paymentMethod") as string;
  const paymentTerms = formData.get("paymentTerms") as string;
  const expiryDateStr = formData.get("expiryDate") as string;
  const note = formData.get("note") as string;
  const thermometer = formData.get("thermometer") === "on";
  const thermometerQty = thermometer ? parseInt(formData.get("thermometerQty") as string) || 0 : 0;
  const pallet = formData.get("pallet") === "on";
  const salesEmployee = formData.get("salesEmployee") as string;

  // Checkboxes
  const transshipment = formData.get("transshipment") === "on" ? "Allowed" : "Not allowed";
  const partialShipment = formData.get("partialShipment") === "on" ? "Allowed" : "Not allowed";

  // Banking
  const bankAccount = formData.get("bankAccount") as string;
  const bankName = formData.get("bankName") as string;
  const bankAddress = formData.get("bankAddress") as string;
  const beneficiaryName = formData.get("beneficiaryName") as string;
  const beneficiaryAddress = formData.get("beneficiaryAddress") as string;
  const swiftCode = formData.get("swiftCode") as string;

  const accompanyingDocuments = formData.get("accompanyingDocuments") as string;

  if (!contractNumber) throw new Error("Số hợp đồng là bắt buộc.");
  if (!contractDateStr) throw new Error("Ngày hợp đồng là bắt buộc.");
  if (!seller || !buyer) throw new Error("Người bán và người mua là bắt buộc.");

  const existing = await (prisma as any).contract.findUnique({
    where: { contractNumber },
  });
  if (existing) throw new Error("Số hợp đồng đã tồn tại.");

  const contract = await (prisma as any).contract.create({
    data: {
      id: crypto.randomUUID(),
      contractNumber,
      contractDate: new Date(contractDateStr),
      seller,
      buyer,
      deliveryDate: deliveryDate || null, // string
      portOfLoading: portOfLoading || null,
      portOfDischarge: portOfDischarge || null,
      transshipment,
      partialShipment,
      deliveryTerms: deliveryTerms || null,
      paymentMethod: paymentMethod || null,
      paymentTerms: paymentTerms || null,
      bank: bankName || null,
      bankAccount: bankAccount || null,
      bankName: bankName || null,
      bankAddress: bankAddress || null,
      beneficiaryName: beneficiaryName || null,
      beneficiaryAddress: beneficiaryAddress || null,
      swiftCode: swiftCode || null,
      accompanyingDocuments: accompanyingDocuments || null,
      expiryDate: expiryDateStr ? new Date(expiryDateStr) : null,
      thermometer,
      thermometerQty,
      pallet,
      salesEmployee: salesEmployee || null,
      status: "Tạo mới",
      note: note || null,
      contractitem: {
        create: items.map((item) => ({
          id: crypto.randomUUID(),
          productCode: item.productCode || null,
          productName: item.productName || "",
          unit: item.unit || null,
          quantity: sanitizeNumber(item.quantity),
          price: sanitizeNumber(item.price),
          amount: sanitizeNumber(item.amount),
          packaging: item.packaging || null,
          note: item.note || null,
          updatedAt: new Date(),
        })),
      },
    },
  });

  const session = await getSession();
  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "Contract",
    recordId: contract.id,
    action: "CREATE",
    newData: contract,
    changedBy,
    changeDetail: `Tạo hợp đồng mới: ${contractNumber}`,
  });

  revalidatePath("/sales/hop-dong");
  revalidatePath("/sales");
}

export async function updateContract(id: string, formData: FormData, items: any[]) {
  const contractDateStr = formData.get("contractDate") as string;
  const seller = formData.get("seller") as string;
  const buyer = formData.get("buyer") as string;
  const deliveryDate = formData.get("deliveryDate") as string; // text free-text
  const portOfLoading = formData.get("portOfLoading") as string;
  const portOfDischarge = formData.get("portOfDischarge") as string;
  const deliveryTerms = formData.get("deliveryTerms") as string;
  const paymentMethod = formData.get("paymentMethod") as string;
  const paymentTerms = formData.get("paymentTerms") as string;
  const expiryDateStr = formData.get("expiryDate") as string;
  const note = formData.get("note") as string;
  const status = formData.get("status") as string;
  const thermometer = formData.get("thermometer") === "on";
  const thermometerQty = thermometer ? parseInt(formData.get("thermometerQty") as string) || 0 : 0;
  const pallet = formData.get("pallet") === "on";
  const salesEmployee = formData.get("salesEmployee") as string;

  // Checkboxes
  const transshipment = formData.get("transshipment") === "on" ? "Allowed" : "Not allowed";
  const partialShipment = formData.get("partialShipment") === "on" ? "Allowed" : "Not allowed";

  // Banking
  const bankAccount = formData.get("bankAccount") as string;
  const bankName = formData.get("bankName") as string;
  const bankAddress = formData.get("bankAddress") as string;
  const beneficiaryName = formData.get("beneficiaryName") as string;
  const beneficiaryAddress = formData.get("beneficiaryAddress") as string;
  const swiftCode = formData.get("swiftCode") as string;

  const accompanyingDocuments = formData.get("accompanyingDocuments") as string;

  if (!contractDateStr) throw new Error("Ngày hợp đồng là bắt buộc.");
  if (!seller || !buyer) throw new Error("Người bán và người mua là bắt buộc.");

  const session = await getSession();
  const oldContract = await (prisma as any).contract.findUnique({
    where: { id },
    include: { contractitem: true },
  });

  if (!oldContract) throw new Error("Hợp đồng không tồn tại.");
  if (oldContract.status !== "Tạo mới") {
    throw new Error(`Không thể chỉnh sửa hợp đồng đang ở trạng thái "${oldContract.status}".`);
  }

  // Delete old contract items and recreate
  await (prisma as any).contractitem.deleteMany({ where: { contractId: id } });

  const updatedContract = await (prisma as any).contract.update({
    where: { id },
    data: {
      contractDate: new Date(contractDateStr),
      seller,
      buyer,
      deliveryDate: deliveryDate || null, // string
      portOfLoading: portOfLoading || null,
      portOfDischarge: portOfDischarge || null,
      transshipment,
      partialShipment,
      deliveryTerms: deliveryTerms || null,
      paymentMethod: paymentMethod || null,
      paymentTerms: paymentTerms || null,
      bank: bankName || null,
      bankAccount: bankAccount || null,
      bankName: bankName || null,
      bankAddress: bankAddress || null,
      beneficiaryName: beneficiaryName || null,
      beneficiaryAddress: beneficiaryAddress || null,
      swiftCode: swiftCode || null,
      accompanyingDocuments: accompanyingDocuments || null,
      expiryDate: expiryDateStr ? new Date(expiryDateStr) : null,
      thermometer,
      thermometerQty,
      pallet,
      salesEmployee: salesEmployee || null,
      status,
      note: note || null,
      contractitem: {
        create: items.map((item) => ({
          id: crypto.randomUUID(),
          productCode: item.productCode || null,
          productName: item.productName || "",
          unit: item.unit || null,
          quantity: sanitizeNumber(item.quantity),
          price: sanitizeNumber(item.price),
          amount: sanitizeNumber(item.amount),
          packaging: item.packaging || null,
          note: item.note || null,
          updatedAt: new Date(),
        })),
      },
    },
    include: { contractitem: true },
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "Contract",
    recordId: id,
    action: "UPDATE",
    oldData: oldContract,
    newData: updatedContract,
    changedBy,
    changeDetail: oldContract?.status !== status ? `Cập nhật hợp đồng (Chuyển trạng thái sang: ${status})` : "Cập nhật thông tin hợp đồng",
  });

  revalidatePath("/sales/hop-dong");
  revalidatePath("/sales");
}

export async function approveContract(id: string) {
  const session = await getSession();
  const oldContract = await (prisma as any).contract.findUnique({ where: { id } });

  await (prisma as any).contract.update({
    where: { id },
    data: { status: "Đã phê duyệt" },
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "Contract",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldContract?.status },
    newData: { status: "Đã phê duyệt" },
    changedBy,
    changeDetail: "Phê duyệt hợp đồng",
  });

  revalidatePath("/sales/hop-dong");
  revalidatePath("/sales");
}

export async function deleteContract(id: string) {
  const contract = await (prisma as any).contract.findUnique({ where: { id } });
  if (contract?.status !== "Tạo mới" && contract?.status !== "Đã hủy") {
    throw new Error("Không thể xóa hợp đồng đã được phê duyệt hoặc đang xử lý.");
  }

  const session = await getSession();
  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await (prisma as any).contract.delete({ where: { id } });

  await logAudit({
    tableName: "Contract",
    recordId: id,
    action: "DELETE",
    oldData: contract,
    changedBy,
    changeDetail: `Xóa hợp đồng: ${contract.contractNumber}`,
  });

  revalidatePath("/sales/hop-dong");
  revalidatePath("/sales");
}

export async function updateContractStatus(id: string, status: string) {
  const session = await getSession();
  const oldContract = await (prisma as any).contract.findUnique({ where: { id } });

  const updatedContract = await (prisma as any).contract.update({
    where: { id },
    data: { status },
  });

  const user = await prisma.user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "Contract",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldContract?.status },
    newData: { status },
    changedBy,
    changeDetail: `Chuyển trạng thái hợp đồng sang: ${status}`,
  });

  revalidatePath("/sales/hop-dong");
  revalidatePath("/sales");
}
