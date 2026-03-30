import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Try to fetch language (safe — column may not exist before db:push)
    let language = "pl";
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: { language: true },
      });
      if (user?.language) language = user.language;
    } catch {
      // language column doesn't exist yet — use default
    }

    return NextResponse.json({
      user: { id: session.id, email: session.email, role: session.role, language },
    });
  } catch (err) {
    console.error("[ME] Error:", err);
    return NextResponse.json({ error: "Auth check failed" }, { status: 500 });
  }
}
