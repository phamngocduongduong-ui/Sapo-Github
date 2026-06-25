import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tableName = searchParams.get("tableName");
  const recordId = searchParams.get("recordId");

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!tableName || !recordId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    let logs: any[] = [];

    if (tableName === "PurchaseOrder") {
      const po = await (prisma as any).purchaseorder.findUnique({
        where: { id: recordId }
      });

      const poLogs = await (prisma as any).auditlog.findMany({
        where: {
          tableName: "PurchaseOrder",
          recordId
        }
      });

      const mappedPoLogs = poLogs.map((log: any) => ({
        ...log,
        changeDetail: `[Mua hàng] ${log.changeDetail || ""}`
      }));
      logs = [...mappedPoLogs];

      if (po && po.paymentProposalId) {
        const ppLogs = await (prisma as any).auditlog.findMany({
          where: {
            tableName: "PaymentProposal",
            recordId: po.paymentProposalId
          }
        });

        const mappedPpLogs = ppLogs.map((log: any) => ({
          ...log,
          changeDetail: `[Thanh toán] ${log.changeDetail || ""}`
        }));
        logs = [...logs, ...mappedPpLogs];
      }
    } else {
      logs = await (prisma as any).auditlog.findMany({
        where: {
          tableName,
          recordId
        }
      });
    }

    // Sort in memory to avoid MySQL 1038 "Out of sort memory" error on large JSON rows
    logs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }
}
