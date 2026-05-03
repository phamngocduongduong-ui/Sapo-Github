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
    const logs = await (prisma as any).auditlog.findMany({
      where: {
        tableName,
        recordId
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }
}
