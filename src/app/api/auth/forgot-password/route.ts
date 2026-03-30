import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // Always return success to prevent email enumeration
    if (!user) {
      console.log("[FORGOT-PW] No user found for:", cleanEmail);
      return NextResponse.json({ success: true });
    }

    // Invalidate old tokens
    await prisma.passwordReset.updateMany({
      where: { email: cleanEmail, used: false },
      data: { used: true },
    });

    // Create new token (expires in 1 hour)
    const token = uuidv4();
    await prisma.passwordReset.create({
      data: {
        email: cleanEmail,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await sendPasswordResetEmail(cleanEmail, token);
    console.log("[FORGOT-PW] ✅ Reset token created for:", cleanEmail);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[FORGOT-PW] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
