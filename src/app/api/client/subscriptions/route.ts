import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const subscriptions = await prisma.subscription.findMany({
      where: {
        OR: [
          { email: session.email },
          { userId: session.id },
        ],
      },
      include: {
        product: { select: { id: true, name: true, code: true } },
        license: { select: { id: true, key: true, domain: true, status: true, expiresAt: true, features: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ subscriptions });
  } catch (err) {
    console.error("[CLIENT-SUBS] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { subscriptionId?: number };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

    if (!body.subscriptionId) return NextResponse.json({ error: "subscriptionId required" }, { status: 400 });

    const sub = await prisma.subscription.findUnique({ where: { id: body.subscriptionId } });
    if (!sub || (sub.email !== session.email && sub.userId !== session.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (sub.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
        console.log("[CLIENT-SUBS] ✅ Scheduled cancellation for:", sub.stripeSubscriptionId);
      } catch (err) {
        console.error("[CLIENT-SUBS] Stripe cancel error:", err);
        return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
      }
    }

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAt: sub.currentPeriodEnd },
    });

    return NextResponse.json({ success: true, message: "Subscription will cancel at end of billing period" });
  } catch (err) {
    console.error("[CLIENT-SUBS] Cancel error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
