import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const reason = url.searchParams.get("reason") || "logout";
  
  cookies().delete("session");
  
  const targetUrl = new URL(`/login?error=${reason}`, req.url);
  return NextResponse.redirect(targetUrl);
}
