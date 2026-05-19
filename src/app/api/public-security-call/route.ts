import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const licensePlate = searchParams.get("licensePlate");
    const registrationId = searchParams.get("id");
    
    if (!licensePlate || !registrationId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const cleanPlate = licensePlate.toUpperCase().trim();

    // 1. Fetch current vehicle registration status
    const registration = await (prisma as any).securityregistration.findUnique({
      where: { id: registrationId }
    });

    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    // 2. Fetch same-day queue stats
    const dateStr = new Date(registration.timeIn).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
    const startOfDay = new Date(`${dateStr}T00:00:00+07:00`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999+07:00`);

    const sameDayRegs = await (prisma as any).securityregistration.findMany({
      where: {
        purpose: registration.purpose,
        timeIn: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: {
        timeIn: "asc"
      }
    });

    // Filter to only include entered vehicles in the queue sequence
    const activeQueueRegs = sameDayRegs.filter((r: any) => r.status === "Đã vào cổng" || r.status === "Đã gọi xe");

    // Sort activeQueueRegs so called vehicles ("Đã gọi xe") come before waiting/registered vehicles ("Đã vào cổng")
    activeQueueRegs.sort((a: any, b: any) => {
      const aIsCalled = a.status === "Đã gọi xe";
      const bIsCalled = b.status === "Đã gọi xe";
      
      if (aIsCalled && !bIsCalled) return -1;
      if (!aIsCalled && bIsCalled) return 1;
      
      if (aIsCalled && bIsCalled) {
        const calledMap = (global as any).calledVehicles;
        
        const aCleanPlate = a.licensePlate.trim().toUpperCase();
        const aCalledInfo = calledMap ? calledMap.get(aCleanPlate) : null;
        const aTime = aCalledInfo ? aCalledInfo.timestamp : new Date(a.updatedAt).getTime();

        const bCleanPlate = b.licensePlate.trim().toUpperCase();
        const bCalledInfo = calledMap ? calledMap.get(bCleanPlate) : null;
        const bTime = bCalledInfo ? bCalledInfo.timestamp : new Date(b.updatedAt).getTime();

        return aTime - bTime;
      }
      
      return new Date(a.timeIn).getTime() - new Date(b.timeIn).getTime();
    });

    const hasEnteredQueue = registration.status === "Đã vào cổng" || registration.status === "Đã gọi xe";

    // 1-indexed order position of this vehicle
    const myIndex = hasEnteredQueue ? activeQueueRegs.findIndex((r: any) => r.id === registration.id) : -1;
    const queueNumber = myIndex !== -1 ? myIndex + 1 : null;

    // Calculate vehicles currently waiting in front of us
    const waitingInFront = myIndex !== -1 ? myIndex : 0;

    // 3. Get called state from global map
    const calledMap = (global as any).calledVehicles;
    const calledInfo = calledMap ? calledMap.get(cleanPlate) : null;

    return NextResponse.json({
      status: registration.status,
      waitingInFront,
      queueNumber,
      calledInfo: calledInfo || null
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
