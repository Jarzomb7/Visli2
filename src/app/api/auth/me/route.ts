import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ user: { id: session.id, email: session.email, role: session.role, language: session.language } });
  } catch (err) {
    console.error("[ME] Error:", err);
    return NextResponse.json({ error: "Auth check failed" }, { status: 500 });
  }
}
