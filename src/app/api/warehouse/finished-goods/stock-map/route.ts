import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get all locations
    const locations = await prisma.finishedgoodslocation.findMany({
      orderBy: [
        { row: 'asc' },
        { bin: 'asc' },
        { level: 'asc' }
      ]
    });

    // Get all products to ensure we have names
    const allProducts = await prisma.product.findMany({
      select: { code: true, name: true }
    });
    const productNameMap: Record<string, string> = {};
    allProducts.forEach(p => productNameMap[p.code] = p.name);

    // Get all stock with quantity > 0 using Raw SQL to ensure all fields (like orderCode) are fetched
    const stocks = await prisma.$queryRaw<any[]>`
      SELECT * FROM finishedgoodsstock WHERE quantity > 0
    `;

    // Group stocks by locationId and ensure product name is correct
    const stockDetailsByLocation: Record<string, any[]> = {};
    stocks.forEach(s => {
      if (!stockDetailsByLocation[s.locationId]) {
        stockDetailsByLocation[s.locationId] = [];
      }
      // Ensure we have the latest name from product table
      const updatedStock = {
        ...s,
        productName: productNameMap[s.productCode] || s.productName
      };
      stockDetailsByLocation[s.locationId].push(updatedStock);
    });

    // Combine data
    const mapData = locations.map(loc => {
      const items = stockDetailsByLocation[loc.id] || [];
      const totalQty = items.reduce((sum, s) => sum + s.quantity, 0);
      return {
        ...loc,
        totalQuantity: totalQty,
        hasStock: totalQty > 0,
        items: items // Return detailed items for filtering
      };
    });

    return NextResponse.json(mapData);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch stock map data" }, { status: 500 });
  }
}
