import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const plans = await prisma.materialPlan.findMany({
    include: { orders: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(plans);
}
