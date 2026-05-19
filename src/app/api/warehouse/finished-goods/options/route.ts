import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Find Cold Storage warehouses
    const coldWarehouses = await prisma.warehouse.findMany({
      where: { name: { contains: "Kho lạnh" } }
    });
    const coldWhIds = coldWarehouses.map(w => w.id);

    const [products, orders, locations, branches] = await Promise.all([
      // 1. Cold Storage Products
      prisma.product.findMany({
        where: { 
          warehouseId: { in: coldWhIds },
          status: "Hoạt động"
        },
        include: { unit: true }
      }),
      // 2. Incomplete Orders
      prisma.order.findMany({
        where: {
          NOT: {
            status: { in: ["Đã hoàn thành", "Đã hủy"] }
          }
        },
        select: {
          id: true,
          orderCode: true
        }
      }),
      // 3. Locations with current stock to check capacity
      prisma.finishedgoodslocation.findMany({
        where: { status: "ACTIVE" },
        include: {
          stock: true
        }
      }),
      // 4. Branches
      prisma.branch.findMany({
        where: { status: "ACTIVE" }
      })
    ]);

    // Calculate current occupancy for each location
    const locationsWithStock = locations.map(loc => {
      const currentQty = loc.stock.reduce((sum, s) => sum + s.quantity, 0);
      return {
        ...loc,
        currentQuantity: currentQty,
        availableCapacity: loc.capacity ? loc.capacity - currentQty : 999999 // Infinite if no capacity set
      };
    });

    return NextResponse.json({
      products,
      orders,
      locations: locationsWithStock,
      branches
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch options" }, { status: 500 });
  }
}
