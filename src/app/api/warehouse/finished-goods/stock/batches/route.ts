import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productCode = searchParams.get("productCode");
  const locationId = searchParams.get("locationId");

  if (!productCode || !locationId) {
    return NextResponse.json({ error: "Missing productCode or locationId" }, { status: 400 });
  }

  try {
    const stocks = await prisma.finishedgoodsstock.findMany({
      where: {
        productCode,
        locationId,
        quantity: { gt: 0 }
      },
      select: {
        batchNumber: true,
        quantity: true
      }
    });

    return NextResponse.json(stocks);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
  }
}
