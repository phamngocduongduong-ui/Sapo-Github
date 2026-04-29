import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const module = searchParams.get("module");

  try {
    switch (module) {
      case "employees":
        return NextResponse.json(await prisma.employee.findMany({ orderBy: { createdAt: "desc" } }));
      case "orders":
        return NextResponse.json(await prisma.order.findMany({ include: { items: true }, orderBy: { createdAt: "desc" } }));
      case "attendance":
        return NextResponse.json(await prisma.attendance.findMany({ orderBy: { createdAt: "desc" } }));
      case "payroll":
        return NextResponse.json(await prisma.payroll.findMany({ include: { details: true }, orderBy: { createdAt: "desc" } }));
      case "salary-levels":
        return NextResponse.json(await prisma.salaryLevel.findMany({ orderBy: { stt: "asc" } }));
      case "labor-contracts":
        return NextResponse.json(await prisma.laborContract.findMany({ orderBy: { createdAt: "desc" } }));
      case "departments":
        return NextResponse.json(await prisma.department.findMany({ orderBy: { createdAt: "desc" } }));
      case "positions":
        return NextResponse.json(await prisma.position.findMany({ orderBy: { createdAt: "desc" } }));
      case "salary-changes":
        return NextResponse.json(await prisma.salaryChange.findMany({ orderBy: { createdAt: "desc" } }));
      case "transfer-promotions":
        return NextResponse.json(await prisma.transferPromotion.findMany({ orderBy: { createdAt: "desc" } }));
      case "material-plans":
        return NextResponse.json(await prisma.materialPlan.findMany({ include: { orders: true }, orderBy: { createdAt: "desc" } }));
      case "purchasing-plans":
        return NextResponse.json(await prisma.purchasingPlan.findMany({ include: { order: true, items: true }, orderBy: { createdAt: "desc" } }));
      case "dispatch-orders":
        return NextResponse.json(await prisma.dispatchOrder.findMany({ orderBy: { createdAt: "desc" } }));
      default:
        return NextResponse.json({ error: "Invalid module" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }
}
