import { NextRequest, NextResponse } from "next/server";
import { getStripe, isValidStripePriceId } from "@/lib/stripe";
import { getSetting } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SMS_PACKAGES: Record<string, { name: string; credits: number; settingKey: string }> = {
  sms_100: { name: "100 SMS", credits: 100, settingKey: "STRIPE_PRICE_SMS_100" },
  sms_500: { name: "500 SMS", credits: 500, settingKey: "STRIPE_PRICE_SMS_500" },
};

export async function POST(request: NextRequest) {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { planId?: number; productCode?: string; domain?: string; addonPackageId?: string };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

    const stripeClient = await getStripe();
    const appUrl = await getSetting("APP_URL", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

    // ━━━ ADDON PURCHASE (one-time) ━━━
    if (body.addonPackageId) {
      const pkg = SMS_PACKAGES[body.addonPackageId];
      if (!pkg) return NextResponse.json({ error: "Invalid addon package" }, { status: 400 });

      const priceId = await getSetting(pkg.settingKey, "");
      if (!priceId || !isValidStripePriceId(priceId)) {
        // No Stripe price configured — create addon directly (demo mode)
        const addon = await prisma.addon.create({
          data: { userId: session.id, type: "sms_pack", amount: pkg.credits, status: "active", meta: pkg.name },
        });
        return NextResponse.json({ success: true, addon });
      }

      const cs = await stripeClient.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: session.email,
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: { type: "addon", addonPackageId: body.addonPackageId, userId: String(session.id), credits: String(pkg.credits) },
        success_url: `${appUrl}/client/billing?addon=success`,
        cancel_url: `${appUrl}/client/billing?addon=cancel`,
      });
      return NextResponse.json({ url: cs.url, sessionId: cs.id });
    }

    // ━━━ PLAN SUBSCRIPTION ━━━
    if (body.planId) {
      const plan = await prisma.plan.findUnique({ where: { id: body.planId } });
      if (!plan || !plan.isActive) return NextResponse.json({ error: "Plan not found or inactive" }, { status: 400 });
      if (!isValidStripePriceId(plan.stripePriceId)) return NextResponse.json({ error: "Plan has no valid Stripe price" }, { status: 400 });

      const domain = body.domain ? body.domain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").replace(/:\d+$/, "") : "PENDING";

      const cs = await stripeClient.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: session.email,
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        metadata: { type: "subscription", planId: String(plan.id), planName: plan.name, productCode: body.productCode || "BOOKING_SYSTEM", plan: plan.name.toLowerCase(), domain },
        success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/checkout/cancel`,
      });
      return NextResponse.json({ url: cs.url, sessionId: cs.id });
    }

    // ━━━ LEGACY: PRODUCT-BASED ━━━
    if (body.productCode) {
      const product = await prisma.product.findUnique({ where: { code: body.productCode.toUpperCase() } });
      if (!product?.active || !product.stripePriceId || !isValidStripePriceId(product.stripePriceId)) {
        return NextResponse.json({ error: "Product not found or no valid Stripe price" }, { status: 400 });
      }
      const domain = body.domain ? body.domain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").replace(/:\d+$/, "") : "PENDING";
      const isSubscription = product.paymentType === "subscription";
      const cs = await stripeClient.checkout.sessions.create({
        mode: isSubscription ? "subscription" : "payment",
        payment_method_types: ["card"],
        customer_email: session.email,
        line_items: [{ price: product.stripePriceId, quantity: 1 }],
        metadata: { productCode: product.code, plan: isSubscription ? "subscription" : "one_time", domain },
        success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/checkout/cancel`,
      });
      return NextResponse.json({ url: cs.url, sessionId: cs.id });
    }

    return NextResponse.json({ error: "Provide planId, productCode, or addonPackageId" }, { status: 400 });
  } catch (err) {
    console.error("[CHECKOUT] ❌ Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
