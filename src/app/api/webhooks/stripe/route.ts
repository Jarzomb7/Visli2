import { NextRequest, NextResponse } from "next/server";
import { getStripe, getWebhookSecret } from "@/lib/stripe";
import {
  handleCheckoutCompleted,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoiceFailed,
} from "@/lib/webhook-handler";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// Alternative endpoint: /api/webhooks/stripe
// Use whichever URL you register in Stripe Dashboard.
export async function POST(request: NextRequest) {
  console.log("[WEBHOOK] ===== via /api/webhooks/stripe =====");

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = await getStripe();
    const secret = await getWebhookSecret();
    if (!secret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  console.log("[WEBHOOK] Event:", event.type, "| ID:", event.id);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
      case "invoice.payment_succeeded":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log("[WEBHOOK] Unhandled:", event.type);
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[WEBHOOK] ❌ Handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
