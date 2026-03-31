import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSetting } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let body: { email?: string; planId?: number; addonPackageId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { email, planId, addonPackageId } = body;

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

    if (!email || !planId) {
      return NextResponse.json({ error: "email and planId are required" }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: "Selected plan unavailable" }, { status: 400 });
    }

    const stripeClient = await getStripe();
    const appUrl = await getSetting("APP_URL", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

    const session = await stripeClient.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      metadata: {
        productCode: plan.name.toUpperCase().replace(/\s+/g, "_"),
        plan: plan.name.toLowerCase(),
        domain: "PENDING",
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
