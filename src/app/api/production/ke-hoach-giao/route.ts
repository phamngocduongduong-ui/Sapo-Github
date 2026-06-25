import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, orderId, shipDateStr } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Thiếu ID đơn hàng." }, { status: 400 });
    }

    const oldOrder = await (prisma as any).order.findUnique({ where: { id: orderId } });
    if (!oldOrder) {
      return NextResponse.json({ error: "Đơn hàng không tồn tại." }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId || "" } });
    const changedBy = user?.employeeName || user?.username || "Hệ thống";

    if (action === "plan") {
      if (!shipDateStr) {
        return NextResponse.json({ error: "Thiếu ngày giao hàng." }, { status: 400 });
      }
      const shipDate = new Date(shipDateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const compareDate = new Date(shipDate);
      compareDate.setHours(0, 0, 0, 0);

      if (compareDate < today) {
        return NextResponse.json({ error: "Không thể lập kế hoạch hoặc dời lịch xuất hàng vào ngày trong quá khứ." }, { status: 400 });
      }

      await (prisma as any).order.update({
        where: { id: orderId },
        data: { 
          status: "Chờ giao hàng",
          shipDate: shipDate
        }
      });

      await logAudit({
        tableName: "Order",
        recordId: orderId,
        action: "STATUS_CHANGE",
        oldData: { status: oldOrder.status, shipDate: oldOrder.shipDate },
        newData: { status: "Chờ giao hàng", shipDate },
        changedBy,
        changeDetail: `Lập lịch xuất hàng cho đơn ${oldOrder.orderCode} vào ngày ${shipDateStr}`
      });

      return NextResponse.json({ success: true });

    } else if (action === "unplan") {
      await (prisma as any).order.update({
        where: { id: orderId },
        data: { 
          status: "Chờ kế hoạch",
          shipDate: null
        }
      });

      await logAudit({
        tableName: "Order",
        recordId: orderId,
        action: "STATUS_CHANGE",
        oldData: { status: oldOrder.status, shipDate: oldOrder.shipDate },
        newData: { status: "Chờ kế hoạch", shipDate: null },
        changedBy,
        changeDetail: `Hủy lập lịch xuất hàng cho đơn ${oldOrder.orderCode}, trả về Chờ kế hoạch`
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
    }

  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
