import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.status === "INACTIVE") {
    return NextResponse.json({ error: "ACCOUNT_INACTIVE" }, { status: 403 });
  }

  const isStaff = user.role?.includes("Nhân viên") && user.username !== "admin" && user.role !== "Admin";
  const userName = user.employeeName || user.username || "";
  const whereClause = isStaff ? { salesEmployee: userName } : {};

  const contracts = await (prisma as any).contract.findMany({
    where: whereClause,
    include: { contractitem: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(contracts);
}
