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
      return NextResponse.json({ error: "Invalid language. Use 'pl' or 'en'." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.id },
      data: { language },
    });

    return NextResponse.json({ success: true, language });
  } catch (err) {
    console.error("[LANG] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
