import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const addons = await prisma.addon.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ addons });
  } catch (err) {
    console.error("[CLIENT-ADDONS] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const ADDON_TYPES: Record<string, { name: string; defaultAmount: number }> = {
  sms_pack: { name: "SMS Package", defaultAmount: 500 },
  ai_credits: { name: "AI Credits", defaultAmount: 1000 },
};

export async function POST(request: NextRequest) {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { type?: string; amount?: number };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

    if (!body.type || !ADDON_TYPES[body.type]) {
      return NextResponse.json({ error: "Invalid addon type. Valid: " + Object.keys(ADDON_TYPES).join(", ") }, { status: 400 });
    }

    const addonConfig = ADDON_TYPES[body.type];
    const amount = body.amount || addonConfig.defaultAmount;

    const addon = await prisma.addon.create({
      data: {
        userId: session.id,
        type: body.type,
        amount,
        status: "active",
        meta: addonConfig.name,
      },
    });

    console.log("[CLIENT-ADDONS] ✅ Addon created:", addon.type, "amount:", addon.amount);

    return NextResponse.json({ success: true, addon });
  } catch (err) {
    console.error("[CLIENT-ADDONS] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
