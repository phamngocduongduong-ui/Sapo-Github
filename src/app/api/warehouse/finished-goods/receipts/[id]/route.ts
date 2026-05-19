import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get receipt details to know what to reverse
      const receipt = await tx.finishedgoodsreceipt.findUnique({
        where: { id },
        include: { details: true }
      });

      if (!receipt) throw new Error("Không tìm thấy phiếu nhập");

      // 2. Reverse stock (Decrement) using Raw SQL to bypass Prisma Client sync issues
      for (const item of receipt.details) {
        if (item.orderCode) {
          await tx.$executeRaw`
            UPDATE finishedgoodsstock 
            SET quantity = quantity - ${item.quantity} 
            WHERE productCode = ${item.productCode} 
              AND batchNumber = ${item.batchNumber} 
              AND locationId = ${item.locationId}
              AND orderCode = ${item.orderCode}
          `;
        } else {
          await tx.$executeRaw`
            UPDATE finishedgoodsstock 
            SET quantity = quantity - ${item.quantity} 
            WHERE productCode = ${item.productCode} 
              AND batchNumber = ${item.batchNumber} 
              AND locationId = ${item.locationId}
              AND orderCode IS NULL
          `;
        }
      }

      // 3. Delete details first
      await tx.finishedgoodsreceiptdetail.deleteMany({
        where: { receiptId: id }
      });

      // 4. Delete receipt
      await tx.finishedgoodsreceipt.delete({
        where: { id }
      });

      return { message: "Xóa phiếu nhập thành công" };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Delete Receipt Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete receipt" }, { status: 500 });
  }
}
