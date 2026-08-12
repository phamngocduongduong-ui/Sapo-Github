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
  const attachments = formData.get("attachments") as string;

  if (!contractNumber) throw new Error("Số hợp đồng là bắt buộc.");
  if (!contractDateStr) throw new Error("Ngày hợp đồng là bắt buộc.");
  if (!seller || !buyer) throw new Error("Người bán và người mua là bắt buộc.");


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
      bankAccount: bankAccount || null,
      accompanyingDocuments: accompanyingDocuments || null,
      attachments: attachments || null,
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
          brix: item.brix ? sanitizeNumber(item.brix) : null,
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

  if (contract.status === "Chờ phê duyệt" || contract.status === "Chờ duyệt") {
    await notifyContractStatusChange(contract, contract.status, changedBy);
  }

  revalidatePath("/sales/hop-dong");
  revalidatePath("/sales");
  revalidatePath("/phe-duyet/hop-dong-ban-hang");
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
  const attachments = formData.get("attachments") as string;

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
      bankAccount: bankAccount || null,
      accompanyingDocuments: accompanyingDocuments || null,
      attachments: attachments || null,
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
          brix: item.brix ? sanitizeNumber(item.brix) : null,
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

  if (oldContract?.status !== status) {
    await notifyContractStatusChange(updatedContract, status, changedBy);
  }

  revalidatePath("/sales/hop-dong");
  revalidatePath("/sales");
  revalidatePath("/phe-duyet/hop-dong-ban-hang");
}

export async function approveContract(id: string) {
  const session = await getSession();
  const oldContract = await (prisma as any).contract.findUnique({ where: { id } });

  const updatedContract = await (prisma as any).contract.update({
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

  await notifyContractStatusChange(updatedContract, "Đã phê duyệt", changedBy);

  revalidatePath("/sales/hop-dong");
  revalidatePath("/sales");
  revalidatePath("/phe-duyet/hop-dong-ban-hang");
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
  revalidatePath("/phe-duyet/hop-dong-ban-hang");
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

  if (oldContract?.status !== status) {
    await notifyContractStatusChange(updatedContract, status, changedBy);
  }

  revalidatePath("/sales/hop-dong");
  revalidatePath("/sales");
  revalidatePath("/phe-duyet/hop-dong-ban-hang");
}

export async function notifyContractStatusChange(contract: any, newStatus: string, submitter?: string) {
  if (!contract) return;
  const contractNumber = contract.contractNumber || "";
  const salesEmployee = (contract.salesEmployee || "").trim();

  // Build target user identifiers specifically for the sales employee displayed on the contract form
  const targetUserIdentifiers = new Set<string>();
  if (salesEmployee) {
    targetUserIdentifiers.add(salesEmployee);
    
    // Find user directly by employeeName or username
    const matchedUsers = await (prisma as any).user.findMany({
      where: {
        OR: [
          { employeeName: salesEmployee },
          { username: salesEmployee }
        ]
      },
      select: { username: true, employeeName: true }
    });
    matchedUsers.forEach((u: any) => {
      if (u.username) targetUserIdentifiers.add(u.username);
      if (u.employeeName) targetUserIdentifiers.add(u.employeeName);
    });

    // Also check employee table by fullName to locate user by employeeId
    const matchedEmp = await (prisma as any).employee.findFirst({
      where: { fullName: salesEmployee },
      select: { id: true, fullName: true }
    });
    if (matchedEmp) {
      const userByEmpId = await (prisma as any).user.findFirst({
        where: { employeeId: matchedEmp.id },
        select: { username: true, employeeName: true }
      });
      if (userByEmpId) {
        if (userByEmpId.username) targetUserIdentifiers.add(userByEmpId.username);
        if (userByEmpId.employeeName) targetUserIdentifiers.add(userByEmpId.employeeName);
      }
    }
  }

  // Fallback to submitter if no salesEmployee was selected on the form
  if (targetUserIdentifiers.size === 0 && submitter && submitter !== "Hệ thống") {
    targetUserIdentifiers.add(submitter);
  }

  const targetUsersStr = Array.from(targetUserIdentifiers).join(",");

  if (newStatus === "Chờ phê duyệt" || newStatus === "Chờ duyệt") {
    await (prisma as any).notification.create({
      data: {
        id: crypto.randomUUID(),
        title: "Phê duyệt hợp đồng bán hàng",
        message: `Hợp đồng số ${contractNumber}${salesEmployee ? ` của NVKD ${salesEmployee}` : ""} đang chờ phê duyệt.`,
        link: "/phe-duyet/hop-dong-ban-hang",
        type: "APPROVAL",
        targetRole: "PERM:PD_HOP_DONG_BH",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  } else if (newStatus === "Đã phê duyệt") {
    if (targetUsersStr) {
      await (prisma as any).notification.create({
        data: {
          id: crypto.randomUUID(),
          title: "Phê duyệt hợp đồng bán hàng",
          message: `Hợp đồng số ${contractNumber} đã được phê duyệt thành công.`,
          link: "/sales/hop-dong",
          type: "SUCCESS",
          targetRole: `USER:${targetUsersStr}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
  } else if (newStatus === "Từ chối") {
    if (targetUsersStr) {
      await (prisma as any).notification.create({
        data: {
          id: crypto.randomUUID(),
          title: "Phê duyệt hợp đồng bán hàng",
          message: `Hợp đồng số ${contractNumber} đã bị từ chối phê duyệt.`,
          link: "/sales/hop-dong",
          type: "ERROR",
          targetRole: `USER:${targetUsersStr}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
  }
}

