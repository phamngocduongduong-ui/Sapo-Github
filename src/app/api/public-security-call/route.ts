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

    // Fetch all same-day registrations, sorted by timeIn ascending
    const allSameDayRegs = await (prisma as any).securityregistration.findMany({
      where: {
        branch: registration.branch,
        timeIn: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: {
        timeIn: "asc"
      }
    });

    // Calculate global registration order number in the day
    const myGlobalIndex = allSameDayRegs.findIndex((r: any) => r.id === registration.id);
    const queueNumber = myGlobalIndex !== -1 ? myGlobalIndex + 1 : null;

    // Filter registrations of the same purpose
    const samePurposeRegs = allSameDayRegs.filter((r: any) => r.purpose === registration.purpose);

    // The wait-to-call queue only includes same-purpose vehicles with status "Đã vào cổng" (not called, not completed)
    const waitingToCallRegs = samePurposeRegs.filter((r: any) => r.status === "Đã vào cổng");
    
    // Sort by entry time (timeIn) ascending (first-in first-served)
    waitingToCallRegs.sort((a: any, b: any) => new Date(a.timeIn).getTime() - new Date(b.timeIn).getTime());

    // Find index in the waiting list
    const myIndexInWaiting = waitingToCallRegs.findIndex((r: any) => r.id === registration.id);
    const myQueuePos = myIndexInWaiting !== -1 ? myIndexInWaiting + 1 : null;
    const waitingInFront = myIndexInWaiting !== -1 ? myIndexInWaiting : 0;

    // 3. Get called state from global map
    const calledMap = (global as any).calledVehicles;
    const calledInfo = calledMap ? calledMap.get(cleanPlate) : null;

    return NextResponse.json({
      status: registration.status,
      waitingInFront,
      queueNumber: myQueuePos,
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
