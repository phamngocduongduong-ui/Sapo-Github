import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

declare global {
  var lastCalledVehicle: { licensePlate: string; clientId: string; type: string; timestamp: number } | undefined;
  var calledVehicles: Map<string, { type: string; timestamp: number }> | undefined;
}

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(global.lastCalledVehicle || null);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { licensePlate, clientId, type } = await request.json();
    if (!licensePlate) {
      return NextResponse.json({ error: "License plate is required" }, { status: 400 });
    }

    const callData = {
      licensePlate,
      clientId: clientId || "",
      type: type || "can-xe",
      timestamp: Date.now()
    };

    global.lastCalledVehicle = callData;

    // Save to global calledVehicles Map
    if (!global.calledVehicles) {
      global.calledVehicles = new Map();
    }
    global.calledVehicles.set(licensePlate, {
      type: type || "can-xe",
      timestamp: Date.now()
    });

    // Update database status of this vehicle to "Đã gọi xe" in real-time
    try {
      const cleanPlate = licensePlate.toUpperCase().trim();
      const registration = await (prisma as any).securityregistration.findFirst({
        where: {
          licensePlate: cleanPlate,
          status: { in: ["Đã đăng ký", "Đã vào cổng", "Đã vào"] }
        },
        orderBy: {
          timeIn: "desc"
        }
      });
      if (registration) {
        await (prisma as any).securityregistration.update({
          where: { id: registration.id },
          data: { status: "Đã gọi xe" }
        });
      }
    } catch (dbErr) {
      console.error("Failed to update status to 'Đã gọi xe' in database:", dbErr);
    }

    return NextResponse.json({ success: true, callData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
