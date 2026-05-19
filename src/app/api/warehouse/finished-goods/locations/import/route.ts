import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { locations } = body;

    if (!locations || !Array.isArray(locations)) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Clear all warehouse related data to allow location reset
      try {
        // Delete stock first (most likely blocker)
        await tx.finishedgoodsstock.deleteMany({});
        // Delete details
        await tx.finishedgoodsreceiptdetail.deleteMany({});
        await tx.finishedgoodsissuedetail.deleteMany({});
        // Finally delete locations
        await tx.finishedgoodslocation.deleteMany({});
      } catch (e: any) {
        console.error("Cleanup error:", e);
        throw new Error("Không thể xóa dữ liệu cũ. Vui lòng liên hệ kỹ thuật.");
      }

      const created = [];
      for (const loc of locations) {
        if (!loc.row || !loc.bin || !loc.level) continue;

        const item = await tx.finishedgoodslocation.create({
          data: {
            row: loc.row.toString(),
            bin: loc.bin.toString(),
            level: loc.level.toString(),
            capacity: loc.capacity ? parseFloat(loc.capacity) : 900,
            status: loc.status === "ACTIVE" || loc.status === "Hoạt động" ? "ACTIVE" : "ACTIVE"
          }
        });
        created.push(item);
      }

      if (created.length === 0) {
        throw new Error("Không có dữ liệu hợp lệ để import. Vui lòng kiểm tra lại file.");
      }

      return created;
    });

    return NextResponse.json({ message: `Đã xử lý ${result.length} vị trí`, data: result });
  } catch (error: any) {
    console.error("Import Locations Error:", error);
    return NextResponse.json({ error: error.message || "Failed to import locations" }, { status: 500 });
  }
}
