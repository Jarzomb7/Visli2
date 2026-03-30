import { NextRequest, NextResponse } from "next/server";
import { getStripe, getPriceIdAsync, isValidStripePriceId } from "@/lib/stripe";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  console.log("[CHECKOUT] ===== Creating checkout session =====");

  try {
    let body: { email?: string; productCode?: string; plan?: string; domain?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { email, productCode, plan, domain } = body;

    if (!email || !productCode || !plan) {
      return NextResponse.json(
        { error: "email, productCode, and plan are required" },
        { status: 400 }
      );
    }

    // Get and validate price ID — rejects placeholders like "TU_WKLEJ_PRICE_ID"
    const priceId = await getPriceIdAsync(productCode, plan);
    if (!priceId) {
      const settingKey = `STRIPE_PRICE_${productCode}_${plan}`.toUpperCase();
      console.error("[CHECKOUT] ❌ No valid price_id for:", settingKey);
      return NextResponse.json(
        {
          error: `No valid Stripe price configured for ${productCode} / ${plan}. Go to Settings → Stripe and set a real price_id (starts with "price_") for ${settingKey}.`,
        },
        { status: 400 }
      );
    }

    // Double-safety: never send non-price_ values to Stripe
    if (!isValidStripePriceId(priceId)) {
      console.error("[CHECKOUT] ❌ Price ID failed final validation:", priceId);
      return NextResponse.json(
        { error: `Invalid price format: "${priceId}". Must be a Stripe price ID starting with "price_".` },
        { status: 400 }
      );
    }

    console.log("[CHECKOUT] Using price_id:", priceId, "for", productCode, plan);

    const cleanDomain = domain
      ? domain.toLowerCase().trim()
          .replace(/^https?:\/\//, "").replace(/^www\./, "")
          .replace(/\/.*$/, "").replace(/:\d+$/, "")
      : "PENDING";

    const stripeClient = await getStripe();
    const appUrl = await getSetting("APP_URL", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

    const session = await stripeClient.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        productCode: productCode.toUpperCase(),
        plan: plan.toLowerCase(),
        domain: cleanDomain,
      },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel`,
    });

    console.log("[CHECKOUT] ✅ Session created:", session.id, "url:", session.url);
    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[CHECKOUT] ❌ Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
