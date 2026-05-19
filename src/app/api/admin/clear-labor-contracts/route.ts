import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const count = await (prisma as any).laborcontract.deleteMany({});
    return NextResponse.json({ 
      success: true, 
      message: `Đã xóa thành công ${count.count} hợp đồng lao động.`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
