import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createToken, setSessionCookie, ensureAdminExists } from "@/lib/auth";

export async function POST(request: NextRequest) {
  console.log("[LOGIN] ===== Login attempt =====");

  try {
    await ensureAdminExists();

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

    console.log("[LOGIN] User found, id:", user.id);

    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log("[LOGIN] Password match:", passwordMatch);

    if (!passwordMatch) {
      console.log("[LOGIN] Password mismatch for:", email);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await createToken(user.id);
    setSessionCookie(token);

    console.log("[LOGIN] ✅ Login successful for:", email);

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
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
