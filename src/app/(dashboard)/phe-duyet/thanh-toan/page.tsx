import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import PaymentProposalClient from "./PaymentProposalClient";
import { generateNextProposalNumber } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PaymentApprovalPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Fetch current user and check permissions
  const user = await (prisma as any).user.findUnique({
    where: { id: session.userId },
    include: { permission: { include: { permissiondetail: true } } }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const permissions = new Set<string>();
  if (user?.permission) {
    user.permission.forEach((p: any) => {
      p.permissiondetail?.forEach((d: any) => {
        if (d.canAccess) {
          permissions.add(d.moduleKey);
        }
      });
    });
  }

  const hasAccess = isAdmin || permissions.has("PD_THANH_TOAN") || permissions.has("KT_PHIEU_CHI") || permissions.has("PHE_DUYET");
  if (!hasAccess) {
    return (
      <div className="main-content" style={{ padding: "2rem" }}>
        <h1>Bạn không có quyền truy cập trang này.</h1>
      </div>
    );
  }

  // Fetch active suppliers list
  const suppliersDb = await (prisma as any).supplier.findMany({
    where: { status: "Hoạt động" },
    orderBy: { code: "asc" }
  });

  // Map to matching client interface
  const suppliers = suppliersDb.map((s: any) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    bankAccountInfo: s.bankAccountInfo || ""
  }));

  // Fetch all payment proposals
  const proposalsDb = await (prisma as any).paymentproposal.findMany({
    include: {
      items: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const proposals = proposalsDb.map((p: any) => ({
    id: p.id,
    proposalNumber: p.proposalNumber,
    date: p.date,
    proposer: p.proposer,
    supplierCode: p.supplierCode,
    supplierName: p.supplierName,
    accountInfo: p.accountInfo,
    purpose: p.purpose,
    status: p.status,
    note: p.note,
    createdAt: p.createdAt,
    items: p.items.map((item: any) => ({
      id: item.id,
      content: item.content,
      unit: item.unit,
      quantity: item.quantity,
      price: item.price,
      amount: item.amount,
      rate: item.rate,
      total: item.total
    }))
  }));

  const currentUserName = user?.employeeName || user?.username || "Nhân viên";
  const nextProposalNumber = await generateNextProposalNumber();

  return (
    <div className="main-content">
      <PaymentProposalClient
        initialProposals={proposals}
        suppliers={suppliers}
        currentUserName={currentUserName}
        nextProposalNumber={nextProposalNumber}
        isApprovalPage={true}
      />
    </div>
  );
}
