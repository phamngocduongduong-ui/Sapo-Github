import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(employees);
}
