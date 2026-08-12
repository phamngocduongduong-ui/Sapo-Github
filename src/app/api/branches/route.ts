import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const branches = await (prisma as any).branch.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" }
    });

    if (!branches || branches.length === 0) {
      return NextResponse.json([
        { id: "1", code: "HCM", name: "Hồ Chí Minh" },
        { id: "2", code: "HN", name: "Hà Nội" },
        { id: "3", code: "DT", name: "Đồng Tháp" }
      ]);
    }

    return NextResponse.json(branches);
  } catch (error) {
    console.error("Error in /api/branches:", error);
    return NextResponse.json([
      { id: "1", code: "HCM", name: "Hồ Chí Minh" },
      { id: "2", code: "HN", name: "Hà Nội" },
      { id: "3", code: "DT", name: "Đồng Tháp" }
    ]);
  }
}
