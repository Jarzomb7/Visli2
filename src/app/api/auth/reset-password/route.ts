import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) return NextResponse.json({ error: "Token and password required" }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    const reset = await prisma.passwordReset.findUnique({ where: { token } });

    if (!reset || reset.used || new Date() > reset.expiresAt) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { email: reset.email },
      data: { password: hashedPassword },
    });

    await prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } });

    console.log("[RESET-PW] ✅ Password reset for:", reset.email);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[RESET-PW] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
