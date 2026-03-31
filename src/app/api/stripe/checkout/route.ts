import { NextRequest, NextResponse } from "next/server";
import { getStripe, isValidStripePriceId } from "@/lib/stripe";
import { getSetting } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  console.log("[CHECKOUT] ===== Creating checkout session =====");

  try {
    let body: { email?: string; productCode?: string; planId?: number; addonPackageId?: string; domain?: string; duration?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { email, productCode, planId, addonPackageId, domain, duration } = body;


    if (addonPackageId) {
      const packages: Record<string, { amount: number; credits: number }> = {
        sms_100: { amount: 2000, credits: 100 },
        sms_500: { amount: 8000, credits: 500 },
      };
      const pkg = packages[addonPackageId];
      if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 });

      const stripeClient = await getStripe();
      const appUrl = await getSetting("APP_URL", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
      const session = await stripeClient.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "pln",
            product_data: { name: `${pkg.credits} SMS` },
            unit_amount: pkg.amount,
          },
          quantity: 1,
        }],
        metadata: { addonPackageId },
        success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/checkout/cancel`,
        ...(email ? { customer_email: email } : {}),
      });
      return NextResponse.json({ url: session.url, sessionId: session.id });
    }

    if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });
    let stripePriceId = "";
    let code = (productCode || "").toUpperCase();
    let planName = duration || "subscription";

    if (planId) {
      const plan = await prisma.plan.findUnique({ where: { id: planId } });
      if (!plan || !plan.isActive) {
        return NextResponse.json({ error: "Selected plan unavailable" }, { status: 400 });
      }
      stripePriceId = plan.stripePriceId;
      code = plan.name.toUpperCase().replace(/\s+/g, "_");
      planName = plan.name.toLowerCase();
    } else if (code) {
      const product = await prisma.product.findUnique({ where: { code } });
      if (!product || !product.active || !product.stripePriceId) {
        return NextResponse.json({ error: "Product unavailable" }, { status: 400 });
      }
      stripePriceId = product.stripePriceId;
    } else {
      return NextResponse.json({ error: "planId or productCode is required" }, { status: 400 });
    }

    if (!isValidStripePriceId(stripePriceId)) {
      return NextResponse.json({ error: "Invalid Stripe price id" }, { status: 400 });
    }

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
        plan: planName,
        domain: cleanDomain,
      },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel`,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
