import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/auth";
import { getStripe, isValidStripePriceId } from "@/lib/stripe";

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

    const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceMonthly: "asc" } });
    return NextResponse.json({ subscriptions, plans });
  } catch (err) {
    console.error("[CLIENT-SUBS] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { subscriptionId?: number; planId?: number };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

    if (!body.subscriptionId || !body.planId) {
      return NextResponse.json({ error: "subscriptionId and planId are required" }, { status: 400 });
    }

    const sub = await prisma.subscription.findUnique({ where: { id: body.subscriptionId } });
    if (!sub || (sub.email !== session.email && sub.userId !== session.id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!sub.stripeSubscriptionId) {
      return NextResponse.json({ error: "Stripe subscription not linked" }, { status: 400 });
    }

    const nextPlan = await prisma.plan.findUnique({ where: { id: body.planId } });
    if (!nextPlan || !nextPlan.isActive) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    const priceId = nextPlan.stripePriceId;
    if (!isValidStripePriceId(priceId)) {
      return NextResponse.json({ error: `Missing Stripe price for ${nextPlan.name}` }, { status: 400 });
    }

    const stripeClient = await getStripe();
    const stripeSub = await stripeClient.subscriptions.retrieve(sub.stripeSubscriptionId);
    const itemId = stripeSub.items.data[0]?.id;

    if (!itemId) {
      return NextResponse.json({ error: "Subscription item not found" }, { status: 400 });
    }

    const updated = await stripeClient.subscriptions.update(sub.stripeSubscriptionId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: "create_prorations",
    });

    const product = await prisma.product.upsert({
      where: { code: nextPlan.name.toUpperCase().replace(/\s+/g, "_") },
      update: {
        name: nextPlan.name,
        stripePriceId: priceId,
        paymentType: "subscription",
        priceCents: Math.round(nextPlan.priceMonthly * 100),
        active: true,
      },
      create: {
        code: nextPlan.name.toUpperCase().replace(/\s+/g, "_"),
        name: nextPlan.name,
        stripePriceId: priceId,
        paymentType: "subscription",
        priceCents: Math.round(nextPlan.priceMonthly * 100),
        active: true,
      },
    });

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        plan: nextPlan.name.toLowerCase(),
        productCode: nextPlan.name.toUpperCase().replace(/\s+/g, "_"),
        productId: product.id,
        stripePriceId: priceId,
        status: updated.status === "active" || updated.status === "trialing" ? "active" : updated.status === "canceled" ? "canceled" : "past_due",
        currentPeriodEnd: new Date(updated.current_period_end * 1000),
      },
    });

    await prisma.license.updateMany({
      where: { stripeSubId: sub.stripeSubscriptionId },
      data: { plan: nextPlan.name.toLowerCase() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[CLIENT-SUBS] Plan change error:", err);
    return NextResponse.json({ error: "Failed to change plan" }, { status: 500 });
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
        const stripeClient = await getStripe();
        await stripeClient.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
        console.log("[CLIENT-SUBS] ✅ Scheduled cancellation for:", sub.stripeSubscriptionId);
      } catch (err) {
        console.error("[CLIENT-SUBS] Stripe cancel error:", err);
        return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
      }
    }

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAt: sub.currentPeriodEnd, status: "canceled" },
    });

    return NextResponse.json({ success: true, message: "Subscription will cancel at end of billing period" });
  } catch (err) {
    console.error("[CLIENT-SUBS] Cancel error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
