import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getAllSettingsWithMeta, bulkSetSettings, clearSettingsCache, maskValue, SENSITIVE_KEYS, SETTINGS_SCHEMA } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const settings = await getAllSettingsWithMeta();

    // Mask sensitive values for display
    const masked = settings.map((s) => ({
      ...s,
      displayValue: maskValue(s.key, s.value),
      sensitive: SENSITIVE_KEYS.includes(s.key),
    }));

    return NextResponse.json({ settings: masked, schema: SETTINGS_SCHEMA });
  } catch (err) {
    console.error("[SETTINGS API] GET error:", err);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { settings?: { key: string; value: string; group: string; label?: string }[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    if (!body.settings || !Array.isArray(body.settings)) {
      return NextResponse.json({ error: "settings array required" }, { status: 400 });
    }

    // Filter out empty values and unchanged sensitive placeholders
    const toSave = body.settings.filter((s) => {
      if (!s.key || !s.value) return false;
      if (s.value.includes("••••")) return false; // Skip masked values
      return true;
    });

    await bulkSetSettings(toSave);
    clearSettingsCache();

    console.log("[SETTINGS API] ✅ Saved", toSave.length, "settings by", session.email);

    return NextResponse.json({ success: true, saved: toSave.length });
  } catch (err) {
    console.error("[SETTINGS API] POST error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
