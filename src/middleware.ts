import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || "visli-default-jwt-secret-change-in-production-32chars!";
  return new TextEncoder().encode(secret);
}

const ADMIN_PATHS = ["/dashboard", "/licenses", "/clients", "/subscriptions", "/features", "/settings"];
const CLIENT_PATHS = ["/client"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));
  const isClientPath = CLIENT_PATHS.some((p) => pathname.startsWith(p));

  if (!isAdminPath && !isClientPath) return NextResponse.next();

  const token = request.cookies.get("visli_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const role = (payload as { role?: string }).role;

    // Force re-login if token was created before role system existed
    if (!role) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.set("visli_token", "", { maxAge: 0, path: "/" });
      return response;
    }

    // Block clients from admin panel
    if (isAdminPath && role !== "admin") {
      return NextResponse.redirect(new URL("/client/dashboard", request.url));
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set("visli_token", "", { maxAge: 0, path: "/" });
    return response;
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/licenses/:path*",
    "/clients/:path*",
    "/subscriptions/:path*",
    "/features/:path*",
    "/settings/:path*",
    "/client/:path*",
  ],
};
