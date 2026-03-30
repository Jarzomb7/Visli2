import { NextResponse } from "next/server";
import { getStripe, getPriceIdAsync, isValidStripePriceId } from "@/lib/stripe";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Quick test checkout endpoint.
 * Usage: GET /api/test-checkout?product=BOOKING_SYSTEM&plan=basic
 * Reads price IDs from DB settings — never uses hardcoded values.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productCode = searchParams.get("product") || "BOOKING_SYSTEM";
    const plan = searchParams.get("plan") || "basic";

    const priceId = await getPriceIdAsync(productCode, plan);
    const settingKey = `STRIPE_PRICE_${productCode}_${plan}`.toUpperCase();

    if (!priceId || !isValidStripePriceId(priceId)) {
      return NextResponse.json(
        {
          error: `No valid Stripe price configured for ${productCode} / ${plan}`,
          hint: `Go to Settings → Stripe and set a real Stripe price_id (starts with "price_") for key: ${settingKey}`,
          currentValue: priceId || "(empty)",
        },
        { status: 400 }
      );
    }

    const appUrl = await getSetting("APP_URL", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
    const stripe = await getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        productCode: productCode.toUpperCase(),
        plan: plan.toLowerCase(),
        domain: "PENDING",
      },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }

    return NextResponse.redirect(session.url);
  } catch (err) {
    console.error("[TEST-CHECKOUT] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
