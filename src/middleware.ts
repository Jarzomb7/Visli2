import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || "visli-default-jwt-secret-change-in-production-32chars!";
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedPaths = ["/dashboard", "/licenses", "/clients", "/subscriptions", "/features"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("visli_token")?.value;

  if (!token) {
    console.log("[MIDDLEWARE] No token, redirecting to login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, getJwtSecret());
    return NextResponse.next();
  } catch {
    console.log("[MIDDLEWARE] Invalid token, redirecting to login");
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/licenses/:path*", "/clients/:path*", "/subscriptions/:path*", "/features/:path*"],
};
