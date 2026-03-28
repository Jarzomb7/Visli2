import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[LOGOUT] Error:", err);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
