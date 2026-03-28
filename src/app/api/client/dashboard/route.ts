import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [subscriptions, licenses, addons] = await Promise.all([
      prisma.subscription.findMany({
        where: { email: session.email },
        include: {
          product: { select: { name: true, code: true } },
          license: { select: { id: true, key: true, domain: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.license.findMany({
        where: { email: session.email },
        include: { product: { select: { name: true, code: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.addon.findMany({
        where: { userId: session.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ subscriptions, licenses, addons, email: session.email });
  } catch (err) {
    console.error("[CLIENT-DASHBOARD] Error:", err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
