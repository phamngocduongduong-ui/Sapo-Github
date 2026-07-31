"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

export async function getDocuments() {
  try {
    const session = await getSession();
    const docs = await (prisma as any).document.findMany({
      orderBy: { effectiveDate: "desc" },
    });

    if (!session || !session.userId) {
      return docs;
    }

    const activeBranch = session.activeBranch || "";

    // Nếu người dùng chọn chi nhánh hoạt động cụ thể (khác "Toàn bộ chi nhánh"), lọc đúng chi nhánh đó
    if (activeBranch && activeBranch.trim().toLowerCase() !== "toàn bộ chi nhánh") {
      const activeLower = activeBranch.trim().toLowerCase();
      return docs.filter((doc: any) => {
        if (!doc.branch) return true;
        const docBranchLower = doc.branch.toLowerCase();

        if (
          docBranchLower.includes("tất cả") ||
          docBranchLower.includes("toàn bộ") ||
          docBranchLower.includes("toàn công ty")
        ) {
          return true;
        }

        const docBranches = doc.branch
          .split(",")
          .map((b: string) => b.trim().toLowerCase())
          .filter(Boolean);

        return docBranches.some(
          (db: string) => db === activeLower || db.includes(activeLower) || activeLower.includes(db)
        );
      });
    }

    return docs;
  } catch (error) {
    console.error("Error fetching documents:", error);
    return [];
  }
}

export async function getBranches() {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { name: "asc" },
    });
    return branches;
  } catch (error) {
    console.error("Error fetching branches:", error);
    return [];
  }
}

export async function createDocument(formData: FormData) {
  const documentNumber = (formData.get("documentNumber") as string)?.trim();
  const draftDateStr = formData.get("draftDate") as string;
  const title = (formData.get("title") as string)?.trim();
  const branch = (formData.get("branch") as string)?.trim();
  const effectiveDateStr = formData.get("effectiveDate") as string;
  const attachments = formData.get("attachments") as string;
  const note = (formData.get("note") as string)?.trim() || null;
  const status = (formData.get("status") as string)?.trim() || "Còn hiệu lực";
  const isDeployed = formData.get("isDeployed") === "true";

  if (!documentNumber) throw new Error("Số văn bản không được để trống!");
  if (!draftDateStr) throw new Error("Ngày soạn không được để trống!");
  if (!title) throw new Error("Tên văn bản không được để trống!");
  if (!branch) throw new Error("Chi nhánh không được để trống!");
  if (!effectiveDateStr) throw new Error("Ngày hiệu lực không được để trống!");

  const existing = await (prisma as any).document.findUnique({
    where: { documentNumber },
  });
  if (existing) {
    throw new Error(`Số văn bản "${documentNumber}" đã tồn tại trên hệ thống!`);
  }

  await (prisma as any).document.create({
    data: {
      documentNumber,
      draftDate: new Date(draftDateStr),
      title,
      branch,
      effectiveDate: new Date(effectiveDateStr),
      attachments: attachments || null,
      status,
      isDeployed,
      note,
    },
  });

  revalidatePath("/van-thu/van-ban");
  revalidatePath("/");
  return { success: true };
}

export async function updateDocument(id: string, formData: FormData) {
  const documentNumber = (formData.get("documentNumber") as string)?.trim();
  const draftDateStr = formData.get("draftDate") as string;
  const title = (formData.get("title") as string)?.trim();
  const branch = (formData.get("branch") as string)?.trim();
  const effectiveDateStr = formData.get("effectiveDate") as string;
  const attachments = formData.get("attachments") as string;
  const note = (formData.get("note") as string)?.trim() || null;
  const status = (formData.get("status") as string)?.trim() || "Còn hiệu lực";
  const isDeployed = formData.get("isDeployed") === "true";

  if (!documentNumber) throw new Error("Số văn bản không được để trống!");
  if (!draftDateStr) throw new Error("Ngày soạn không được để trống!");
  if (!title) throw new Error("Tên văn bản không được để trống!");
  if (!branch) throw new Error("Chi nhánh không được để trống!");
  if (!effectiveDateStr) throw new Error("Ngày hiệu lực không được để trống!");

  const existing = await (prisma as any).document.findUnique({
    where: { documentNumber },
  });
  if (existing && existing.id !== id) {
    throw new Error(`Số văn bản "${documentNumber}" đã được sử dụng bởi văn bản khác!`);
  }

  await (prisma as any).document.update({
    where: { id },
    data: {
      documentNumber,
      draftDate: new Date(draftDateStr),
      title,
      branch,
      effectiveDate: new Date(effectiveDateStr),
      attachments: attachments || null,
      status,
      isDeployed,
      note,
    },
  });

  revalidatePath("/van-thu/van-ban");
  revalidatePath("/");
  return { success: true };
}

export async function toggleDocumentDeployment(id: string, isDeployed: boolean) {
  await (prisma as any).document.update({
    where: { id },
    data: { isDeployed },
  });

  revalidatePath("/van-thu/van-ban");
  revalidatePath("/");
  return { success: true };
}

export async function updateDocumentStatus(id: string, status: string) {
  await (prisma as any).document.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/van-thu/van-ban");
  revalidatePath("/");
  return { success: true };
}

export async function deleteDocument(id: string) {
  await (prisma as any).document.delete({
    where: { id },
  });

  revalidatePath("/van-thu/van-ban");
  revalidatePath("/");
  return { success: true };
}

export async function getPendingDeployedDocuments() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return [];
    }

    const user = await (prisma as any).user.findUnique({
      where: { id: session.userId },
      select: { username: true, employeeName: true, branch: true }
    });

    if (!user) return [];

    // Xác định chi nhánh người dùng đang hoạt động thực tế
    const activeBranch = session.activeBranch || "";
    const userBranchStr = user.branch || "";

    const userBranchesLower = new Set<string>();

    // Nếu người dùng đang chọn 1 chi nhánh làm việc cụ thể (khác "Toàn bộ chi nhánh"), chỉ lọc đúng chi nhánh đó
    if (activeBranch && activeBranch.trim().toLowerCase() !== "toàn bộ chi nhánh") {
      userBranchesLower.add(activeBranch.trim().toLowerCase());
    } else if (userBranchStr) {
      userBranchStr.split(",").forEach((b: string) => {
        const trimmed = b.trim().toLowerCase();
        if (trimmed && trimmed !== "toàn bộ chi nhánh") userBranchesLower.add(trimmed);
      });
    }

    const deployedDocs = await (prisma as any).document.findMany({
      where: {
        isDeployed: true,
        status: { in: ["Còn hiệu lực", "Hiệu lực"] },
      },
      orderBy: { effectiveDate: "desc" },
    });

    if (deployedDocs.length === 0) return [];

    // Lọc văn bản thuộc đúng chi nhánh người dùng đang hoạt động
    const targetDocs = deployedDocs.filter((doc: any) => {
      if (!doc.branch) return true;
      const docBranchLower = doc.branch.toLowerCase();

      // Nếu văn bản áp dụng cho toàn bộ / tất cả chi nhánh
      if (
        docBranchLower.includes("tất cả") ||
        docBranchLower.includes("toàn bộ") ||
        docBranchLower.includes("toàn công ty")
      ) {
        return true;
      }

      // Tách danh sách chi nhánh được áp dụng trong văn bản
      const docBranches = doc.branch
        .split(",")
        .map((b: string) => b.trim().toLowerCase())
        .filter(Boolean);

      // Nếu người dùng không có thông tin chi nhánh thì mặc định cho phép xem
      if (userBranchesLower.size === 0) return true;

      // Chỉ hiển thị nếu chi nhánh văn bản chứa chi nhánh người dùng đang hoạt động
      return Array.from(userBranchesLower).some((ub) => {
        return docBranches.some(
          (db) => db === ub || db.includes(ub) || ub.includes(db)
        );
      });
    });

    if (targetDocs.length === 0) return [];

    // Kiểm tra xem user đã xác nhận chưa
    const confirmations = await (prisma as any).documentconfirmation.findMany({
      where: {
        username: user.username,
        documentId: { in: targetDocs.map((d: any) => d.id) }
      }
    });

    const confirmedDocIds = new Set(confirmations.map((c: any) => c.documentId));
    return targetDocs.filter((doc: any) => !confirmedDocIds.has(doc.id));
  } catch (error) {
    console.error("Lỗi lấy danh sách văn bản triển khai chưa xác nhận:", error);
    return [];
  }
}

export async function confirmDocumentRead(documentId: string) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      throw new Error("Phiên làm việc không hợp lệ!");
    }

    const user = await (prisma as any).user.findUnique({
      where: { id: session.userId },
      select: { username: true, employeeName: true, branch: true }
    });

    if (!user) {
      throw new Error("Không tìm thấy thông tin người dùng!");
    }

    const existing = await (prisma as any).documentconfirmation.findFirst({
      where: {
        documentId,
        username: user.username,
      },
    });

    if (!existing) {
      await (prisma as any).documentconfirmation.create({
        data: {
          documentId,
          username: user.username,
          employeeName: user.employeeName || user.username,
          branch: session.activeBranch || user.branch || null,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Lỗi xác nhận đã đọc văn bản:", error);
    throw error;
  }
}

export async function getDocumentConfirmations(documentId: string) {
  try {
    const confirmations = await (prisma as any).documentconfirmation.findMany({
      where: { documentId },
      orderBy: { confirmedAt: "desc" },
    });
    return confirmations;
  } catch (error) {
    console.error("Lỗi lấy danh sách xác nhận văn bản:", error);
    return [];
  }
}

export async function getDocumentById(id: string) {
  try {
    const doc = await (prisma as any).document.findUnique({
      where: { id },
    });
    return doc;
  } catch (error) {
    console.error("Lỗi lấy thông tin văn bản theo id:", error);
    return null;
  }
}
