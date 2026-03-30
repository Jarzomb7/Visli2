import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "visli_token";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || "visli-default-jwt-secret-change-in-production-32chars!";
  return new TextEncoder().encode(secret);
}

export async function createToken(userId: number, role: string = "client"): Promise<string> {
  console.log("[AUTH] Creating token for user:", userId, "role:", role);
  return new SignJWT({ sub: String(userId), role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<{ sub: string; role?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as { sub: string; role?: string };
  } catch (err) {
    console.log("[AUTH] Token verification failed:", err);
    return null;
  }
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function getSession(): Promise<{ id: number; email: string; role: string } | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload?.sub) return null;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(payload.sub) },
      select: { id: true, email: true, role: true },
    });

    if (!user) return null;
    return user;
  } catch (err) {
    console.error("[AUTH] getSession error:", err);
    return null;
  }
}

export async function getAdminSession(): Promise<{ id: number; email: string; role: string } | null> {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function getClientSession(): Promise<{ id: number; email: string; role: string } | null> {
  const session = await getSession();
  if (!session) return null;
  return session;
}

export async function ensureAdminExists(): Promise<void> {
  try {
    const admin = await prisma.user.findUnique({ where: { email: "admin@visli.io" } });
    if (!admin) {
      console.log("[SEED] Creating default admin...");
      const hashedPassword = await bcrypt.hash("admin123", 12);
      await prisma.user.create({
        data: { email: "admin@visli.io", password: hashedPassword, role: "admin" },
      });
      console.log("[SEED] ✅ Default admin created: admin@visli.io / admin123");
    } else if (admin.role !== "admin") {
      await prisma.user.update({ where: { id: admin.id }, data: { role: "admin" } });
      console.log("[SEED] ✅ Updated admin@visli.io role to admin");
    }
  } catch (err) {
    console.error("[SEED] Auto-seed error (non-fatal):", err);
  }
}

export async function ensureProductsExist(): Promise<void> {
  try {
    const productCount = await prisma.product.count();
    if (productCount === 0) {
      await prisma.product.createMany({
        data: [
          { name: "Booking System", code: "BOOKING_SYSTEM" },
          { name: "Chatbot AI", code: "CHATBOT_AI" },
        ],
        skipDuplicates: true,
      });
      console.log("[SEED] ✅ Default products created");
    }
  } catch (err) {
    console.error("[SEED] Auto-seed products error (non-fatal):", err);
  }
}

export { ensureFeaturesExist } from "./features";
