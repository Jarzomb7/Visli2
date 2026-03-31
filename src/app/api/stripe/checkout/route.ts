import { NextRequest, NextResponse } from "next/server";
import { getStripe, isValidStripePriceId } from "@/lib/stripe";
import { getSetting } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { getBillingPlan } from "@/lib/billing-plans";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  console.log("[CHECKOUT] ===== Creating checkout session =====");

  try {
    let body: { email?: string; productCode?: string; plan?: string; domain?: string; duration?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { email, productCode, plan, domain, duration } = body;

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const selectedPlan = plan ? getBillingPlan(plan) : null;
    const code = (selectedPlan?.productCode || productCode || "").toUpperCase();

    if (!code) {
      return NextResponse.json({ error: "productCode or plan is required" }, { status: 400 });
    }

    let product = await prisma.product.findUnique({ where: { code } });
    if (product && !product.active) {
      return NextResponse.json({ error: `Product not found or inactive: ${code}` }, { status: 400 });
    }

    const planPriceId = selectedPlan ? await getSetting(selectedPlan.settingKey, "") : "";
    const stripePriceId = selectedPlan ? planPriceId : product?.stripePriceId || "";

    if (!stripePriceId || !isValidStripePriceId(stripePriceId)) {
      return NextResponse.json({ error: `No valid Stripe price configured for ${selectedPlan?.name || code}` }, { status: 400 });
    }

    if (!product) {
      product = await prisma.product.create({
        data: {
          code,
          name: selectedPlan?.name || code,
          paymentType: "subscription",
          stripePriceId,
          priceCents: selectedPlan ? Math.round(selectedPlan.priceMonthly * 100) : null,
          active: true,
        },
      });
    }

    console.log("[CHECKOUT] Product:", product.name, "Price:", stripePriceId, "Type:", product.paymentType);

    const cleanDomain = domain
      ? domain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").replace(/:\d+$/, "")
      : "PENDING";

    const stripeClient = await getStripe();
    const appUrl = await getSetting("APP_URL", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

    const session = await stripeClient.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      metadata: {
        productCode: code,
        plan: selectedPlan?.id || duration || "subscription",
        domain: cleanDomain,
      },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel`,
    });

    console.log("[CHECKOUT] ✅ Session created:", session.id);
    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[CHECKOUT] ❌ Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
