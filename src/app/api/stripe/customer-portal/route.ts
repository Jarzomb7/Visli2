import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Find Stripe customer ID from subscriptions
    const sub = await prisma.subscription.findFirst({
      where: { email: session.email, stripeCustomerId: { not: null } },
      select: { stripeCustomerId: true },
    });

    if (!sub?.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer found. Purchase a subscription first." }, { status: 404 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/app/billing`,
    });

    console.log("[PORTAL] ✅ Portal session created for:", session.email);

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("[PORTAL] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
