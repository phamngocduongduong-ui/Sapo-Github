import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "./lib/session";

const protectedRoutes = ["/admin", "/sales", "/production", "/purchasing", "/"];
const publicRoutes = ["/login"];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some(route => path === route || path.startsWith(`${route}/`));
  const isPublicRoute = publicRoutes.includes(path);

  // Skip middleware for API and static files
  if (path.startsWith("/api") || path.startsWith("/_next") || path.includes(".")) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get("session")?.value;
  const session = cookie ? await decrypt(cookie).catch(() => null) : null;

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isPublicRoute && session) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  // RBAC checks (Tạm thời bỏ qua check cứng role 'ADMIN' để bạn truy cập được bảng tài khoản)
  // if (session && path.startsWith("/admin") && session.role !== "ADMIN") {
  //   return NextResponse.redirect(new URL("/", req.nextUrl));
  // }

  return NextResponse.next();
}
