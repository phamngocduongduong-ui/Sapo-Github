"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getUserPermission } from "@/lib/permissions";
import { generateNextProposalNumber } from "../../phe-duyet/thanh-toan/actions";

export async function getBranches() {
  return await (prisma as any).branch.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" }
  });
}

export async function getPurchaseOrders() {
  const session = await getSession();
  if (!session) return [];

  const user = await (prisma as any).user.findUnique({
    where: { id: session.userId }
  });
  if (!user) return [];

  const isAdmin = user.username === "admin" || user.role === "Admin";
  
  let filter: any = {};
  if (!isAdmin) {
    const { allBranches } = await getUserPermission(user.id, "TM_LENH_MUA");
    const userBranch = (user.branch || "").toLowerCase();
    const isHCM = userBranch.includes("hcm") || userBranch.includes("hồ chí minh");

    if (allBranches || isHCM) {
      // See all branches
    } else {
      const activeBranch = session.activeBranch || user.branch?.split(",")[0]?.trim() || "";
      filter = { branch: activeBranch };
    }
  }

  return await (prisma as any).purchaseorder.findMany({
    where: filter,
    include: { purchaseorderdetail: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPheDuyetPurchaseOrders() {
  const session = await getSession();
  if (!session) return [];

  const user = await (prisma as any).user.findUnique({
    where: { id: session.userId }
  });
  if (!user) return [];

  const isAdmin = user.username === "admin" || user.role === "Admin";
  
  let branchFilter: any = undefined;
  if (!isAdmin) {
    const { allBranches } = await getUserPermission(user.id, "TM_LENH_MUA");
    const userBranch = (user.branch || "").toLowerCase();
    const isHCM = userBranch.includes("hcm") || userBranch.includes("hồ chí minh");

    if (!allBranches && !isHCM) {
      branchFilter = session.activeBranch || user.branch?.split(",")[0]?.trim() || "";
    }
  }

  return await (prisma as any).purchaseorder.findMany({
    where: {
      branch: branchFilter,
      status: { notIn: ["Tạo mới"] }
    },
    include: { purchaseorderdetail: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProducts() {
  return await (prisma as any).product.findMany({
    include: { unit: true }
  });
}

export async function getWarehouses() {
  return await (prisma as any).warehouse.findMany({
    where: { status: "Hoạt động" }
  });
}

async function generatePOCode(branchName: string) {
  if (!branchName) return "";
  const firstBranchName = branchName.split(",")[0].trim();
  const branch = await (prisma as any).branch.findFirst({ where: { name: firstBranchName } });
  if (!branch) return "";

  const now = new Date();
  const yearSuffix = now.getFullYear().toString().slice(-2); // e.g. "26"

  const orders = await (prisma as any).purchaseorder.findMany({
    select: { poCode: true }
  });

  const prefix = `PO${yearSuffix}`;
  const nums = orders
    .map((o: any) => {
      if (!o.poCode || !o.poCode.startsWith(prefix)) return 0;
      const parts = o.poCode.split("/");
      const codePart = parts[0]; // e.g. "PO2600001"
      const numStr = codePart.substring(4); // remove "PO26" (4 chars)
      return parseInt(numStr);
    })
    .filter((n: any) => !isNaN(n));

  const max = nums.length > 0 ? Math.max(...nums) : 0;
  const nextNum = (max + 1).toString().padStart(4, "0");

  return `${prefix}${nextNum}/${branch.code}`;
}


export async function getSuppliers() {
  return await (prisma as any).supplier.findMany({
    where: {
      status: "Hoạt động"
    },
    orderBy: { name: "asc" }
  });
}

function extractProposalCode(purpose: string | null): string | null {
  if (!purpose || !purpose.includes("đề xuất ")) return null;
  const parts = purpose.split("đề xuất ");
  return parts.length > 1 ? parts[1].trim() : null;
}

export async function syncProposalStatus(proposalCode: string) {
  const session = await getSession();
  const user = await (prisma as any).user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  // 1. Fetch proposal and its items
  let isMaintenance = true;
  let proposal = await (prisma as any).maintenanceproposal.findFirst({
    where: { proposalCode },
    include: { items: true }
  });
  if (!proposal) {
    proposal = await (prisma as any).purchasingproposal.findFirst({
      where: { proposalCode },
      include: { items: true }
    });
    isMaintenance = false;
  }

  if (!proposal) return;

  // 2. Fetch all PO details linked to this proposalCode
  const poDetails = await (prisma as any).purchaseorderdetail.findMany({
    where: {
      purchaseorder: {
        purpose: {
          contains: proposalCode
        },
        status: {
          notIn: ["Tạo mới", "Từ chối"]
        }
      }
    },
    select: {
      proposalProductName: true,
      requestedQuantity: true
    }
  });

  // 3. Check if all items are fully purchased
  let isFullyPurchased = true;
  if (proposal.items.length === 0) {
    isFullyPurchased = false;
  }

  for (const item of proposal.items) {
    const orderedQty = poDetails
      .filter((d: any) => d.proposalProductName === item.productName)
      .reduce((sum: number, d: any) => sum + (d.requestedQuantity || 0), 0);

    if (orderedQty < item.quantity) {
      isFullyPurchased = false;
      break;
    }
  }

  // 4. Update the proposal status accordingly
  const isApproved = isMaintenance ? (proposal.status === "Đã phê duyệt") : (proposal.status === "Chờ thực hiện" || proposal.status === "Đã phê duyệt");
  if (isApproved || proposal.status === "Hoàn thành") {
    const newStatus = isFullyPurchased ? "Hoàn thành" : (isMaintenance ? "Đã phê duyệt" : "Chờ thực hiện");
    if (proposal.status !== newStatus) {
      await (prisma as any)[isMaintenance ? "maintenanceproposal" : "purchasingproposal"].update({
        where: { id: proposal.id },
        data: { status: newStatus, updatedAt: new Date() }
      });

      await logAudit({
        tableName: isMaintenance ? "MaintenanceProposal" : "PurchasingProposal",
        recordId: proposal.id,
        action: "STATUS_CHANGE",
        oldData: { status: proposal.status },
        newData: { status: newStatus },
        changedBy,
        changeDetail: newStatus === "Hoàn thành"
          ? `Tự động chuyển trạng thái sang Hoàn thành do mua đủ`
          : `Tự động chuyển trạng thái sang Đề nghị chờ đặt (${newStatus}) do chưa mua đủ`
      });
    }
  }
}

export async function syncProposalStatusByPO(purpose: string | null) {
  const proposalCode = extractProposalCode(purpose);
  if (proposalCode) {
    await syncProposalStatus(proposalCode);
  }
}

export async function createPurchaseOrder(formData: FormData, details: any[], initialStatus: string = "Tạo mới") {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const creator = user?.employeeName || user?.username || "Hệ thống";

  const requestedDate = formData.get("requestedDate") as string;
  const purpose = formData.get("purpose") as string;
  const note = formData.get("note") as string;
  const selectedBranch = formData.get("branch") as string;
  const deliveryLocation = formData.get("deliveryLocation") as string;
  const supplier = formData.get("supplier") as string;
  const paymentType = formData.get("paymentType") as string;
  const deliveryDateStr = formData.get("deliveryDate") as string;
  const deliveryDate = deliveryDateStr ? new Date(deliveryDateStr) : null;

  const branch = selectedBranch || user?.branch?.split(",")[0].trim() || "";
  const creatorBranchName = user?.branch?.split(",")[0].trim() || "";
  const poCode = await generatePOCode(creatorBranchName);

  const id = require('crypto').randomUUID();
  const now = new Date();

  const po = await (prisma as any).purchaseorder.create({
    data: {
      id,
      poCode,
      creator,
      branch,
      requestedDate: new Date(requestedDate),
      purpose,
      note: note || "",
      deliveryLocation: deliveryLocation || "",
      supplier: supplier || null,
      paymentType: paymentType || "Phê duyệt trước, thanh toán sau",
      deliveryDate,
      status: initialStatus,
      paymentStatus: initialStatus === "Chờ phê duyệt" ? "Chưa xác định" : "Chờ thanh toán",
      updatedAt: now,
      purchaseorderdetail: {
        create: details.map(d => {
          const reqQty = parseFloat(d.requestedQuantity) || 0;
          const uPrice = parseFloat(d.price) || 0;
          const propQty = d.proposalQuantity !== undefined && d.proposalQuantity !== null ? parseFloat(d.proposalQuantity) : null;
          return {
            id: require('crypto').randomUUID(),
            productCode: d.productCode,
            productName: d.productName,
            proposalProductName: d.proposalProductName || d.originalProposalProductName || null,
            requestedQuantity: reqQty,
            proposalQuantity: propQty,
            price: uPrice,
            amount: reqQty * uPrice,
            unit: d.unit || "",
            note: d.note || "",
            updatedAt: now
          };
        })
      }
    }
  });

  await logAudit({
    tableName: "PurchaseOrder",
    recordId: po.id,
    action: "CREATE",
    newData: po,
    changedBy: creator,
    changeDetail: `Tạo lệnh mua mới: ${poCode}`
  });

  await syncProposalStatusByPO(po.purpose);

  revalidatePath("/purchasing/lenh-mua");
  return po;
}

export async function updatePurchaseOrder(id: string, formData: FormData, details: any[]) {
  const session = await getSession();
  const oldPO = await (prisma as any).purchaseorder.findUnique({ 
    where: { id },
    include: { purchaseorderdetail: true }
  });

  const requestedDate = formData.get("requestedDate") as string;
  const purpose = formData.get("purpose") as string;
  const note = formData.get("note") as string;
  const deliveryLocation = formData.get("deliveryLocation") as string;
  const supplier = formData.get("supplier") as string;
  const paymentType = formData.get("paymentType") as string;
  const deliveryDateStr = formData.get("deliveryDate") as string;
  const deliveryDate = deliveryDateStr ? new Date(deliveryDateStr) : null;

  const now = new Date();
  const updatedPO = await (prisma as any).purchaseorder.update({
    where: { id },
    data: {
      requestedDate: new Date(requestedDate),
      purpose,
      note: note || "",
      deliveryLocation: deliveryLocation || "",
      supplier: supplier || null,
      paymentType: paymentType || "Phê duyệt trước, thanh toán sau",
      deliveryDate,
      updatedAt: now,
      purchaseorderdetail: {
        deleteMany: {},
        create: details.map(d => {
          const reqQty = parseFloat(d.requestedQuantity) || 0;
          const uPrice = parseFloat(d.price) || 0;
          const propQty = d.proposalQuantity !== undefined && d.proposalQuantity !== null ? parseFloat(d.proposalQuantity) : null;
          return {
            id: require('crypto').randomUUID(),
            productCode: d.productCode,
            productName: d.productName,
            proposalProductName: d.proposalProductName || d.originalProposalProductName || null,
            requestedQuantity: reqQty,
            proposalQuantity: propQty,
            price: uPrice,
            amount: reqQty * uPrice,
            unit: d.unit || "",
            note: d.note || "",
            updatedAt: now
          };
        })
      }
    }
  });

  const user = await (prisma as any).user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "PurchaseOrder",
    recordId: id,
    action: "UPDATE",
    oldData: oldPO,
    newData: updatedPO,
    changedBy,
    changeDetail: `Cập nhật lệnh mua: ${updatedPO.poCode}`
  });

  await syncProposalStatusByPO(oldPO?.purpose);
  if (updatedPO.purpose !== oldPO?.purpose) {
    await syncProposalStatusByPO(updatedPO.purpose);
  }

  revalidatePath("/purchasing/lenh-mua");
}



async function processPOPaymentAndStatus(poId: string, isApproval: boolean = false) {
  const po = await (prisma as any).purchaseorder.findUnique({
    where: { id: poId }
  });
  if (!po) return;

  const sup = await (prisma as any).supplier.findFirst({
    where: { name: po.supplier || "" }
  });

  const debtDays = sup ? (sup.debtDays > 0 ? sup.debtDays : (() => {
    const match = (sup.debtPolicy || "").match(/\d+/);
    return match ? parseInt(match[0], 10) || 0 : 0;
  })()) : 0;

  const isAdvancePayment = po.paymentType === "Thanh toán trước, phê duyệt sau";

  if (!isAdvancePayment && sup && debtDays > 0) {
    await (prisma as any).purchaseorder.update({
      where: { id: poId },
      data: {
        status: "Chờ giao hàng",
        paymentStatus: `Công nợ ${debtDays} ngày`,
        updatedAt: new Date()
      }
    });
  } else {
    if (isApproval) {
      const proposalNumber = await generateNextProposalNumber();
      const proposalId = require('crypto').randomUUID();

      const poDetails = await (prisma as any).purchaseorderdetail.findMany({
        where: { purchaseOrderId: poId }
      });

      await (prisma as any).paymentproposal.create({
        data: {
          id: proposalId,
          proposalNumber,
          proposer: po.creator || "Hệ thống",
          supplierCode: sup?.code || null,
          supplierName: sup?.name || null,
          accountInfo: sup?.bankAccountInfo || null,
          purpose: `Thanh toán đơn mua hàng ${po.poCode}`,
          note: po.note || null,
          status: "Chờ phê duyệt công nợ",
          items: {
            create: poDetails.map((item: any) => {
              const amount = (item.requestedQuantity || 0) * (item.price || 0);
              return {
                id: require('crypto').randomUUID(),
                content: item.productName,
                unit: item.unit || null,
                quantity: item.requestedQuantity || 0,
                price: item.price || 0,
                amount,
                rate: 0,
                total: amount
              };
            })
          }
        }
      });

      await logAudit({
        tableName: "PaymentProposal",
        recordId: proposalId,
        action: "CREATE",
        newData: {
          proposalNumber,
          proposer: po.creator || "Hệ thống",
          supplierName: sup?.name || null,
          purpose: `Thanh toán đơn mua hàng ${po.poCode}`,
          status: "Chờ phê duyệt công nợ"
        },
        changedBy: po.creator || "Hệ thống",
        changeDetail: `Tự động tạo đề xuất thanh toán từ đơn mua hàng ${po.poCode}: ${proposalNumber}`
      });

      await (prisma as any).purchaseorder.update({
        where: { id: poId },
        data: {
          status: "Chờ thanh toán",
          paymentStatus: "Chờ thanh toán",
          paymentProposalId: proposalId,
          updatedAt: new Date()
        }
      });
      revalidatePath("/phe-duyet/thanh-toan");
    } else {
      await (prisma as any).purchaseorder.update({
        where: { id: poId },
        data: {
          status: "Chờ phê duyệt",
          paymentStatus: "Chờ thanh toán",
          updatedAt: new Date()
        }
      });
    }
  }
}

export async function updatePOStatus(id: string, status: string) {
  const session = await getSession();
  const oldPO = await (prisma as any).purchaseorder.findUnique({ where: { id } });

  const user = await (prisma as any).user.findUnique({ where: { id: session?.userId || "" } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  if (status === "Chờ thực hiện") {
    await processPOPaymentAndStatus(id, true);

    await logAudit({
      tableName: "PurchaseOrder",
      recordId: id,
      action: "STATUS_CHANGE",
      oldData: { status: oldPO?.status },
      newData: { status: "Chờ thực hiện (Đã phê duyệt)" },
      changedBy,
      changeDetail: `Phê duyệt đơn mua: ${oldPO?.poCode}`
    });
  } else {
    let updateData: any = { status, updatedAt: new Date() };
    if (status === "Tạo mới") {
      updateData.paymentProposalId = null;
      updateData.paymentStatus = "Chờ thanh toán";
    } else if (status === "Từ chối") {
      updateData.paymentProposalId = null;
      updateData.paymentStatus = "Từ chối phê duyệt";
    } else if (status === "Chờ phê duyệt") {
      updateData.paymentStatus = "Chưa xác định";
    }

    const updatedPO = await (prisma as any).purchaseorder.update({
      where: { id },
      data: updateData
    });

    if ((status === "Tạo mới" || status === "Từ chối") && oldPO?.paymentProposalId) {
      try {
        await (prisma as any).paymentproposal.delete({
          where: { id: oldPO.paymentProposalId }
        });
      } catch (e) {
        console.error("Failed to delete payment proposal", e);
      }
    }

    await logAudit({
      tableName: "PurchaseOrder",
      recordId: id,
      action: "STATUS_CHANGE",
      oldData: { status: oldPO?.status, paymentProposalId: oldPO?.paymentProposalId },
      newData: { status, paymentProposalId: null },
      changedBy,
      changeDetail: status === "Tạo mới" && oldPO?.status === "Chờ thanh toán"
        ? `Thu hồi đơn mua hàng từ trạng thái Chờ thanh toán về trạng thái Tạo mới (đã xóa đề xuất thanh toán): ${oldPO?.poCode}`
        : `Chuyển trạng thái lệnh mua sang: ${status}`
    });
  }

  await syncProposalStatusByPO(oldPO?.purpose);

  revalidatePath("/purchasing/lenh-mua");
  revalidatePath("/phe-duyet/thanh-toan");
}

export async function confirmPOPayment(poId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const changer = user?.employeeName || user?.username || "Hệ thống";

  const po = await (prisma as any).purchaseorder.findUnique({ where: { id: poId } });
  if (!po) throw new Error("Không tìm thấy đơn mua hàng");

  await (prisma as any).purchaseorder.update({
    where: { id: poId },
    data: {
      status: "Chờ giao hàng",
      paymentStatus: "Đã thanh toán",
      updatedAt: new Date()
    }
  });

  if (po.paymentProposalId) {
    await (prisma as any).paymentproposal.update({
      where: { id: po.paymentProposalId },
      data: {
        status: "Hoàn thành",
        updatedAt: new Date()
      }
    });

    await logAudit({
      tableName: "PaymentProposal",
      recordId: po.paymentProposalId,
      action: "STATUS_CHANGE",
      oldData: { status: "Chờ thanh toán" },
      newData: { status: "Hoàn thành" },
      changedBy: changer,
      changeDetail: `Đồng bộ trạng thái hoàn thành từ xác nhận thanh toán đơn mua: ${po.poCode}`
    });
  }

  await logAudit({
    tableName: "PurchaseOrder",
    recordId: poId,
    action: "STATUS_CHANGE",
    oldData: { paymentStatus: po.paymentStatus, status: po.status },
    newData: { paymentStatus: "Đã thanh toán", status: "Chờ giao hàng" },
    changedBy: changer,
    changeDetail: `Xác nhận thanh toán cho đơn mua: ${po.poCode}`
  });

  revalidatePath("/purchasing/lenh-mua");
  revalidatePath("/phe-duyet/thanh-toan");
}

export async function deletePurchaseOrder(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  if (!isAdmin) throw new Error("Chỉ tài khoản Admin mới có quyền xóa đơn mua hàng");

  const oldPO = await (prisma as any).purchaseorder.findUnique({ where: { id } });
  if (!oldPO) throw new Error("Không tìm thấy đơn mua hàng cần xóa");

  await (prisma as any).purchaseorder.delete({ where: { id } });

  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "PurchaseOrder",
    recordId: id,
    action: "DELETE",
    oldData: oldPO,
    changedBy,
    changeDetail: `Xóa đơn mua hàng: ${oldPO?.poCode}`
  });

  await syncProposalStatusByPO(oldPO?.purpose);

  revalidatePath("/purchasing/lenh-mua");
}

export async function recallPurchaseOrder(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const oldPO = await (prisma as any).purchaseorder.findUnique({ where: { id } });
  if (!oldPO) throw new Error("Không tìm thấy đơn mua hàng cần thu hồi");

  if (oldPO.status !== "Chờ phê duyệt" && oldPO.status !== "Chờ thanh toán") {
    throw new Error("Chỉ có thể thu hồi đơn mua hàng đang chờ phê duyệt hoặc chờ thanh toán");
  }

  await (prisma as any).purchaseorder.delete({ where: { id } });

  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  await logAudit({
    tableName: "PurchaseOrder",
    recordId: id,
    action: "DELETE",
    oldData: oldPO,
    changedBy,
    changeDetail: `Thu hồi và xóa đơn mua hàng: ${oldPO?.poCode}`
  });

  await syncProposalStatusByPO(oldPO?.purpose);

  revalidatePath("/purchasing/lenh-mua");
}

export async function getMaintenanceProposals() {
  const session = await getSession();
  if (!session) return [];

  const user = await (prisma as any).user.findUnique({
    where: { id: session.userId }
  });
  if (!user) return [];

  const isAdmin = user.username === "admin" || user.role === "Admin";
  
  if (!isAdmin) {
    const { canAccess } = await getUserPermission(user.id, "TM_LENH_MUA");
    if (!canAccess) {
      return [];
    }
  }

  // Purchasing staff need to view all approved proposals across all branches to create purchase orders
  const filter: any = {};

  const [mProposals, pProposals] = await Promise.all([
    (prisma as any).maintenanceproposal.findMany({
      where: filter,
      include: { items: true },
      orderBy: { createdAt: "desc" }
    }),
    (prisma as any).purchasingproposal.findMany({
      where: filter,
      include: { items: true },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const proposals = [...mProposals, ...pProposals].sort((a: any, b: any) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Calculate ordered quantity and PO status for each item
  for (const proposal of proposals) {
    const proposalCode = proposal.proposalCode;
    const poDetails = await (prisma as any).purchaseorderdetail.findMany({
      where: {
        purchaseorder: {
          purpose: {
            contains: proposalCode
          },
          status: {
            notIn: ["Tạo mới", "Từ chối"]
          }
        }
      },
      select: {
        proposalProductName: true,
        requestedQuantity: true,
        purchaseorder: {
          select: {
            status: true
          }
        }
      }
    });

    for (const item of proposal.items) {
      const matchedDetails = poDetails.filter((d: any) => d.proposalProductName === item.productName);
      const orderedQty = matchedDetails.reduce((sum: number, d: any) => sum + (d.requestedQuantity || 0), 0);
      (item as any).orderedQuantity = orderedQty;
      
      if (orderedQty > 0) {
        const statuses = Array.from(new Set(matchedDetails.map((d: any) => d.purchaseorder?.status).filter(Boolean)));
        (item as any).poStatus = statuses.join(", ");
      } else {
        (item as any).poStatus = "";
      }
    }
  }

  return proposals;
}

export async function createPOFromProposal(proposalId: string, formData: FormData, details: any[]) {
  // First, create the purchase order
  const po = await createPurchaseOrder(formData, details, "Tạo mới");

  // Log audit trail for appropriate proposal model
  const session = await getSession();
  const user = await (prisma as any).user.findUnique({ where: { id: session?.userId || "" } });
  const creator = user?.employeeName || user?.username || "Hệ thống";

  let isMaintenance = true;
  let proposal = await (prisma as any).maintenanceproposal.findUnique({ where: { id: proposalId } });
  if (!proposal) {
    proposal = await (prisma as any).purchasingproposal.findUnique({ where: { id: proposalId } });
    isMaintenance = false;
  }

  await logAudit({
    tableName: isMaintenance ? "MaintenanceProposal" : "PurchasingProposal",
    recordId: proposalId,
    action: "UPDATE",
    newData: null,
    changedBy: creator,
    changeDetail: `Đã lập đơn mua hàng từ đề nghị (Đơn mua: ${po.poCode})`
  });

  revalidatePath("/purchasing/lenh-mua");
  revalidatePath("/maintenance/de-nghi-mua");
  revalidatePath("/purchasing/de-nghi");
  return po;
}

export async function completeProposal(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  let isMaintenance = true;
  let oldProposal = await (prisma as any).maintenanceproposal.findUnique({ where: { id } });
  if (!oldProposal) {
    oldProposal = await (prisma as any).purchasingproposal.findUnique({ where: { id } });
    isMaintenance = false;
  }
  if (!oldProposal) throw new Error("Không tìm thấy đề nghị mua");

  const updatedProposal = await (prisma as any)[isMaintenance ? "maintenanceproposal" : "purchasingproposal"].update({
    where: { id },
    data: { status: "Hoàn thành", updatedAt: new Date() }
  });

  await logAudit({
    tableName: isMaintenance ? "MaintenanceProposal" : "PurchasingProposal",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldProposal.status },
    newData: { status: "Hoàn thành" },
    changedBy,
    changeDetail: `Xác nhận Hoàn thành trực tiếp từ Đơn mua hàng`
  });

  revalidatePath("/purchasing/lenh-mua");
  revalidatePath("/maintenance/de-nghi-mua");
  revalidatePath("/maintenance/phe-duyet");
  revalidatePath("/purchasing/de-nghi");
  revalidatePath("/purchasing/phe-duyet-de-nghi");

  return updatedProposal;
}

export async function rejectProposal(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  let isMaintenance = true;
  let oldProposal = await (prisma as any).maintenanceproposal.findUnique({ where: { id } });
  if (!oldProposal) {
    oldProposal = await (prisma as any).purchasingproposal.findUnique({ where: { id } });
    isMaintenance = false;
  }
  if (!oldProposal) throw new Error("Không tìm thấy đề nghị mua");

  const updatedProposal = await (prisma as any)[isMaintenance ? "maintenanceproposal" : "purchasingproposal"].update({
    where: { id },
    data: { status: "Tạo mới", updatedAt: new Date() }
  });

  await logAudit({
    tableName: isMaintenance ? "MaintenanceProposal" : "PurchasingProposal",
    recordId: id,
    action: "STATUS_CHANGE",
    oldData: { status: oldProposal.status },
    newData: { status: "Tạo mới" },
    changedBy,
    changeDetail: `Từ chối đề nghị mua trực tiếp từ Đơn mua hàng`
  });

  revalidatePath("/purchasing/lenh-mua");
  revalidatePath("/purchasing/de-nghi");
  revalidatePath("/purchasing/phe-duyet-de-nghi");

  return updatedProposal;
}

export async function updatePODeliveryDate(id: string, deliveryDateStr: string | null) {
  const session = await getSession();
  if (!session) throw new Error("Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn");

  const user = await (prisma as any).user.findUnique({ where: { id: session.userId } });
  const changedBy = user?.employeeName || user?.username || "Hệ thống";

  const oldPO = await (prisma as any).purchaseorder.findUnique({ where: { id } });
  if (!oldPO) throw new Error("Không tìm thấy đơn mua hàng");

  const deliveryDate = deliveryDateStr ? new Date(deliveryDateStr) : null;
  const status = deliveryDate ? "Chờ giao hàng" : "Tạo mới";

  const updatedPO = await (prisma as any).purchaseorder.update({
    where: { id },
    data: { deliveryDate, status, updatedAt: new Date() }
  });

  await logAudit({
    tableName: "PurchaseOrder",
    recordId: id,
    action: "UPDATE",
    oldData: { deliveryDate: oldPO.deliveryDate, status: oldPO.status },
    newData: { deliveryDate, status },
    changedBy,
    changeDetail: deliveryDate
      ? `Cập nhật ngày dự kiến giao: ${deliveryDate.toLocaleDateString("vi-VN")} (Trạng thái: Chờ giao hàng)`
      : "Xóa ngày dự kiến giao (Trạng thái: Tạo mới)"
  });

  revalidatePath("/purchasing/lenh-mua");
  return updatedPO;
}
