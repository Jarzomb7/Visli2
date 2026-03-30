import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { setSetting, clearSettingsCache } from "@/lib/settings";
import { resetStripeClient } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { key?: string; value?: string; group?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    if (!body.key || typeof body.value !== "string") {
      return NextResponse.json({ error: "key and value required" }, { status: 400 });
    }

    await setSetting(body.key, body.value, body.group || "general");
    clearSettingsCache();

    // Reset Stripe client if Stripe key changed
    if (body.key === "STRIPE_SECRET_KEY") {
      resetStripeClient();
      console.log("[SETTINGS] Stripe client reset due to key change");
    }

    console.log("[SETTINGS] ✅ Updated:", body.key, "by", session.email);

    return NextResponse.json({ success: true, key: body.key });
  } catch (err) {
    console.error("[SETTINGS UPDATE] Error:", err);
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
  }
}
