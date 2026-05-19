import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const issues = await prisma.finishedgoodsissue.findMany({
      include: {
        details: {
          include: {
            location: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(issues);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch issues" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { issueCode, date, creator, note, items } = body;

    // Use transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check stock sufficiency for all items using Raw SQL
      for (const item of items) {
        const stocks = await tx.$queryRaw<any[]>`
          SELECT quantity FROM finishedgoodsstock 
          WHERE productCode = ${item.productCode} 
            AND batchNumber = ${item.batchNumber} 
            AND locationId = ${item.locationId}
            AND (orderCode = ${item.orderCode} OR (orderCode IS NULL AND ${item.orderCode} IS NULL))
          LIMIT 1
        `;

        const stockQuantity = stocks && stocks.length > 0 ? stocks[0].quantity : 0;

        if (stockQuantity < parseFloat(item.quantity)) {
          throw new Error(`Số lượng tồn không đủ cho sản phẩm ${item.productName} (Tồn: ${stockQuantity}) tại vị trí và đơn hàng đã chọn.`);
        }
      }

      // 2. Create issue
      const issue = await tx.finishedgoodsissue.create({
        data: {
          issueCode,
          date: new Date(date),
          creator,
          note,
          status: "COMPLETED",
          details: {
            create: items.map((item: any) => ({
              productCode: item.productCode,
              productName: item.productName,
              batchNumber: item.batchNumber,
              locationId: item.locationId,
              quantity: parseFloat(item.quantity),
              unit: item.unit,
              orderCode: item.orderCode,
              note: item.note
            }))
          }
        }
      });

      // 3. Update stock using Raw SQL
      for (const item of items) {
        await tx.$executeRaw`
          UPDATE finishedgoodsstock 
          SET quantity = quantity - ${parseFloat(item.quantity)}, updatedAt = NOW()
          WHERE productCode = ${item.productCode} 
            AND batchNumber = ${item.batchNumber} 
            AND locationId = ${item.locationId}
            AND (orderCode = ${item.orderCode} OR (orderCode IS NULL AND ${item.orderCode} IS NULL))
        `;
      }

      return issue;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Mã phiếu xuất đã tồn tại" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to create issue" }, { status: 500 });
  }
}
