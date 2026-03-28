import { NextRequest, NextResponse } from "next/server";
import { getStripe, getPriceIdAsync } from "@/lib/stripe";
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

    const priceId = await getPriceIdAsync(productCode, plan);
    if (!priceId) {
      console.log("[CHECKOUT] ❌ No price configured for:", productCode, plan);
      return NextResponse.json(
        { error: `No Stripe price configured for ${productCode} ${plan}` },
        { status: 400 }
      );
    }

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

    console.log("[CHECKOUT] ✅ Session created:", session.id);
    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[CHECKOUT] ❌ Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
