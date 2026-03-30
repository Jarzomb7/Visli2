import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { language } = await request.json();
    if (language !== "pl" && language !== "en") {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }

    // Try to save — if language column doesn't exist yet (no db:push), just succeed silently
    try {
      await prisma.user.update({ where: { id: session.id }, data: { language } });
    } catch (dbErr) {
      console.warn("[LANG] Could not save language to DB (column may not exist yet):", dbErr);
    }

    return NextResponse.json({ success: true, language });
  } catch (err) {
    console.error("[LANG] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
