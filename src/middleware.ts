import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "./lib/session";

const publicRoutes = ["/login", "/dk", "/x"];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const userAgent = req.headers.get("user-agent") || "";
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isEmbedded = req.nextUrl.searchParams.get("embedded") === "true";

  // Skip middleware for API, Next.js internal files, and static files
  if (
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.includes(".")
  ) {
    return NextResponse.next();
  }

  // Determine if it is a public route (e.g. /login, /dk, /x/something)
  const isPublicRoute = publicRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );

  const cookie = req.cookies.get("session")?.value;
  const session = cookie ? await decrypt(cookie).catch(() => null) : null;

  // Redirect to login if accessing a protected route without session
  if (!isPublicRoute && !session) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Mobile User Agent Auto-Redirect
  if (isMobile && !path.startsWith("/mobile") && !isEmbedded) {
    if (session) {
      return NextResponse.redirect(new URL("/mobile", req.nextUrl));
    }
  }

  // Redirect to home or mobile if logged-in user tries to access /login
  if (path === "/login" && session) {
    if (isMobile) {
      return NextResponse.redirect(new URL("/mobile", req.nextUrl));
    }
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}
