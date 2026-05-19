import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const locations = await prisma.finishedgoodslocation.findMany({
      orderBy: [
        { row: 'asc' },
        { bin: 'asc' },
        { level: 'asc' }
      ]
    });
    return NextResponse.json(locations);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { row, bin, level, capacity, note } = body;

    const location = await prisma.finishedgoodslocation.create({
      data: {
        row,
        bin,
        level,
        capacity: parseFloat(capacity) || 900,
        note,
        status: "ACTIVE"
      }
    });

    return NextResponse.json(location);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Vị trí này đã tồn tại" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
  }
}
