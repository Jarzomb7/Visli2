import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createToken, setSessionCookie, ensureAdminExists, ensureProductsExist, ensureFeaturesExist } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  console.log("[LOGIN] ===== Login attempt =====");

  try {
    await ensureAdminExists();
    await ensureProductsExist();
    await ensureFeaturesExist();

    let body: { email?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      console.log("[LOGIN] Failed to parse request body");
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { email, password } = body;
    console.log("[LOGIN] Email:", email);

    if (!email || !password) {
      console.log("[LOGIN] Missing email or password");
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      console.log("[LOGIN] User not found:", email);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    console.log("[LOGIN] User found, id:", user.id, "role:", user.role);

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      console.log("[LOGIN] Password mismatch for:", email);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await createToken(user.id, user.role);
    setSessionCookie(token);

    console.log("[LOGIN] ✅ Login successful for:", email, "role:", user.role);

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("[LOGIN] ❌ Unexpected error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Login failed: " + message },
      { status: 500 }
    );
  }
}
