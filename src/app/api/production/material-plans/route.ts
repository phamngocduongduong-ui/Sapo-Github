import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const plans = await (prisma as any).materialplan.findMany({
    include: { order: { include: { orderitem: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(plans);
}
