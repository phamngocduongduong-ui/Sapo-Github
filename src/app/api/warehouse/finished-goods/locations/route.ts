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

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, row, bin, level, capacity, note, status } = body;

    const location = await prisma.finishedgoodslocation.update({
      where: { id },
      data: {
        row,
        bin,
        level,
        capacity: parseFloat(capacity) || 900,
        note,
        status
      }
    });

    return NextResponse.json(location);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Vị trí này đã tồn tại" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    // Check relations
    const stockCount = await prisma.finishedgoodsstock.count({ where: { locationId: id } });
    const receiptCount = await prisma.finishedgoodsreceiptdetail.count({ where: { locationId: id } });
    const issueCount = await prisma.finishedgoodsissuedetail.count({ where: { locationId: id } });

    if (stockCount > 0 || receiptCount > 0 || issueCount > 0) {
      return NextResponse.json({
        error: "Dòng đã phát sinh dữ liệu (tồn kho hoặc chứng từ liên quan), không thể xóa!"
      }, { status: 400 });
    }

    await prisma.finishedgoodslocation.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete location" }, { status: 500 });
  }
}
