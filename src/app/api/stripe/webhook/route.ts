import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, getFeaturesForPlan } from "@/lib/stripe";
import { generateLicenseKey } from "@/lib/license";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  console.log("[WEBHOOK] ===== Stripe webhook received =====");

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    console.log("[WEBHOOK] ❌ Missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("[WEBHOOK] ❌ Signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  console.log("[WEBHOOK] Event type:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("[WEBHOOK] checkout.session.completed:", session.id);

        const email = session.customer_email || session.customer_details?.email || "";
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const metadata = session.metadata || {};
        const productCode = metadata.productCode || "BOOKING_SYSTEM";
        const plan = metadata.plan || "basic";
        const domain = metadata.domain || "";

        if (!email) {
          console.log("[WEBHOOK] ❌ No email found in session");
          break;
        }

        // Get subscription details for period end
        let periodEnd: Date | null = null;
        if (subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            periodEnd = new Date(sub.current_period_end * 1000);
          } catch (e) {
            console.error("[WEBHOOK] Failed to fetch subscription:", e);
            periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          }
        } else {
          periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }

        // Upsert subscription record
        await prisma.subscription.upsert({
          where: { stripeSubscriptionId: subscriptionId },
          update: {
            status: "active",
            plan,
            productCode,
            currentPeriodEnd: periodEnd,
            stripeCustomerId: customerId,
          },
          create: {
            email,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            status: "active",
            plan,
            productCode,
            currentPeriodEnd: periodEnd,
          },
        });

        // Find product
        const product = await prisma.product.findUnique({
          where: { code: productCode },
        });

        // Auto-create license
        const features = getFeaturesForPlan(plan);
        const license = await prisma.license.create({
          data: {
            key: generateLicenseKey(),
            domain,
            status: "active",
            plan,
            features,
            email,
            domainLocked: !!domain,
            stripeSubId: subscriptionId,
            expiresAt: periodEnd,
            productId: product?.id || null,
          },
        });

        console.log("[WEBHOOK] ✅ License auto-created:", license.key, "for", email);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        console.log("[WEBHOOK] invoice.payment_succeeded for sub:", subscriptionId);

        // Update subscription period
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const periodEnd = new Date(sub.current_period_end * 1000);

          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              status: "active",
              currentPeriodEnd: periodEnd,
            },
          });

          // Extend license expiry
          await prisma.license.updateMany({
            where: { stripeSubId: subscriptionId },
            data: {
              status: "active",
              expiresAt: periodEnd,
            },
          });

          console.log("[WEBHOOK] ✅ Subscription + license renewed until:", periodEnd);
        } catch (e) {
          console.error("[WEBHOOK] Failed to process renewal:", e);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        console.log("[WEBHOOK] ❌ invoice.payment_failed for sub:", subscriptionId);

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { status: "past_due" },
        });

        await prisma.license.updateMany({
          where: { stripeSubId: subscriptionId },
          data: { status: "suspended" },
        });

        console.log("[WEBHOOK] ✅ License suspended due to payment failure");
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        console.log("[WEBHOOK] customer.subscription.deleted:", subscription.id);

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: "canceled" },
        });

        await prisma.license.updateMany({
          where: { stripeSubId: subscription.id },
          data: { status: "expired" },
        });

        console.log("[WEBHOOK] ✅ Subscription canceled, license expired");
        break;
      }

      default:
        console.log("[WEBHOOK] Unhandled event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[WEBHOOK] ❌ Handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
