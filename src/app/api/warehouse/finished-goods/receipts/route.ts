import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const receipts = await prisma.finishedgoodsreceipt.findMany({
      include: {
        details: {
          include: {
            location: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(receipts);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch receipts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { receiptCode, date, creator, purpose, description, note, items } = body;

    // Use transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create receipt
      const receipt = await tx.finishedgoodsreceipt.create({
        data: {
          receiptCode,
          date: new Date(date),
          creator,
          purpose,
          description,
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

      // 2. Update stock using Raw SQL to bypass Prisma Client sync issues
      for (const item of items) {
        const stockItems = await tx.$queryRaw<any[]>`
          SELECT id FROM finishedgoodsstock 
          WHERE productCode = ${item.productCode} 
            AND batchNumber = ${item.batchNumber} 
            AND locationId = ${item.locationId}
            AND (orderCode = ${item.orderCode} OR (orderCode IS NULL AND ${item.orderCode} IS NULL))
          LIMIT 1
        `;

        if (stockItems && stockItems.length > 0) {
          await tx.$executeRaw`
            UPDATE finishedgoodsstock 
            SET quantity = quantity + ${parseFloat(item.quantity)}, updatedAt = NOW()
            WHERE id = ${stockItems[0].id}
          `;
        } else {
          const newId = `stk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await tx.$executeRaw`
            INSERT INTO finishedgoodsstock (id, productCode, productName, batchNumber, locationId, orderCode, quantity, updatedAt)
            VALUES (${newId}, ${item.productCode}, ${item.productName}, ${item.batchNumber}, ${item.locationId}, ${item.orderCode || null}, ${parseFloat(item.quantity)}, NOW())
          `;
        }
      }

      return receipt;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Mã phiếu nhập đã tồn tại" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create receipt: " + error.message }, { status: 500 });
  }
}
