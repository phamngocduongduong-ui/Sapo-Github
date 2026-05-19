import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get issue details to know what to reverse
      const issue = await tx.finishedgoodsissue.findUnique({
        where: { id },
        include: { details: true }
      });

      if (!issue) throw new Error("Không tìm thấy phiếu xuất");

      // 2. Reverse stock (Increment back) using Raw SQL
      for (const item of issue.details) {
        if (item.orderCode) {
          await tx.$executeRaw`
            UPDATE finishedgoodsstock 
            SET quantity = quantity + ${item.quantity} 
            WHERE productCode = ${item.productCode} 
              AND batchNumber = ${item.batchNumber} 
              AND locationId = ${item.locationId}
              AND orderCode = ${item.orderCode}
          `;
        } else {
          await tx.$executeRaw`
            UPDATE finishedgoodsstock 
            SET quantity = quantity + ${item.quantity} 
            WHERE productCode = ${item.productCode} 
              AND batchNumber = ${item.batchNumber} 
              AND locationId = ${item.locationId}
              AND orderCode IS NULL
          `;
        }
      }

      // 3. Delete details
      await tx.finishedgoodsissuedetail.deleteMany({
        where: { issueId: id }
      });

      // 4. Delete issue
      await tx.finishedgoodsissue.delete({
        where: { id }
      });

      return { message: "Xóa phiếu xuất thành công" };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Delete Issue Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete issue" }, { status: 500 });
  }
}
