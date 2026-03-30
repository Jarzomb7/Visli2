import { NextRequest, NextResponse } from "next/server";
import { getStripe, isValidStripePriceId } from "@/lib/stripe";
import { getSetting } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

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

    const { email, productCode, domain, duration } = body;

    if (!email || !productCode) {
      return NextResponse.json({ error: "email and productCode are required" }, { status: 400 });
    }

    // Load product from DB
    const product = await prisma.product.findUnique({ where: { code: productCode.toUpperCase() } });
    if (!product || !product.active) {
      return NextResponse.json({ error: `Product not found or inactive: ${productCode}` }, { status: 400 });
    }

    if (!product.stripePriceId || !isValidStripePriceId(product.stripePriceId)) {
      return NextResponse.json({ error: `No valid Stripe price configured for product: ${product.name}. Go to Products and assign a price_id.` }, { status: 400 });
    }

    console.log("[CHECKOUT] Product:", product.name, "Price:", product.stripePriceId, "Type:", product.paymentType);

    const cleanDomain = domain
      ? domain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").replace(/:\d+$/, "")
      : "PENDING";

    const stripeClient = await getStripe();
    const appUrl = await getSetting("APP_URL", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

    const isSubscription = product.paymentType === "subscription";

    const session = await stripeClient.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: product.stripePriceId, quantity: 1 }],
      metadata: {
        productCode: product.code,
        plan: duration || (isSubscription ? "subscription" : "one_time"),
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
