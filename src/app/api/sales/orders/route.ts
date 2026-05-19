import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const orders = await (prisma as any).order.findMany({
    include: { orderitem: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders);
}
