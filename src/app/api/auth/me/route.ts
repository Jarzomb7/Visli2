import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, email: true, role: true, language: true },
    });
    return NextResponse.json({ user });
  } catch (err) {
    console.error("[ME] Error:", err);
    return NextResponse.json({ error: "Auth check failed" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const body = await request.json();
    if (body.language && (body.language === "pl" || body.language === "en")) {
      await prisma.user.update({
        where: { id: session.id },
        data: { language: body.language },
      });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  } catch (err) {
    console.error("[ME] PATCH Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
