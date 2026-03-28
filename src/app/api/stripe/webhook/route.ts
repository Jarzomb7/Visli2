import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, getFeaturesForPlan, resolveFromSubscription } from "@/lib/stripe";
import { generateLicenseKey } from "@/lib/license";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

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

  console.log("[WEBHOOK] Event type:", event.type, "ID:", event.id);

  try {
    switch (event.type) {
      // ─── CHECKOUT COMPLETED ────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("[WEBHOOK] checkout.session.completed:", session.id);

        const email = session.customer_email || session.customer_details?.email || "";
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const metadata = session.metadata || {};
        const productCode = metadata.productCode || "BOOKING_SYSTEM";
        const plan = metadata.plan || "basic";
        const domain = metadata.domain || "PENDING";

        if (!email) {
          console.log("[WEBHOOK] ❌ No email found in session");
          break;
        }

        // Fetch subscription for period end and price
        let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        let stripePriceId: string | null = null;
        if (subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            periodEnd = new Date(sub.current_period_end * 1000);
            stripePriceId = sub.items?.data?.[0]?.price?.id || null;
          } catch (e) {
            console.error("[WEBHOOK] Failed to fetch subscription:", e);
          }
        }

        // Find product
        const product = await prisma.product.findUnique({
          where: { code: productCode },
        });

        // Auto-create license
        const features = getFeaturesForPlan(plan);
        const license = await prisma.license.create({
          data: {
            key: generateLicenseKey(),
            domain: domain,
            status: "active",
            plan,
            features,
            email,
            domainLocked: domain !== "PENDING",
            stripeSubId: subscriptionId,
            expiresAt: periodEnd,
            productId: product?.id || null,
          },
        });

        console.log("[WEBHOOK] ✅ License auto-created:", license.key, "for", email);

        // Create subscription record linked to license
        await prisma.subscription.upsert({
          where: { stripeSubscriptionId: subscriptionId },
          update: {
            status: "active",
            plan,
            productCode,
            productId: product?.id || null,
            currentPeriodEnd: periodEnd,
            stripeCustomerId: customerId,
            stripePriceId,
            licenseId: license.id,
          },
          create: {
            email,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId,
            status: "active",
            plan,
            productCode,
            productId: product?.id || null,
            currentPeriodEnd: periodEnd,
            licenseId: license.id,
          },
        });

        console.log("[WEBHOOK] ✅ Subscription linked to license:", license.id);
        break;
      }

      // ─── INVOICE PAID (renewal) ────────────────────────────
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        console.log("[WEBHOOK] invoice.paid for sub:", subscriptionId);

        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const periodEnd = new Date(sub.current_period_end * 1000);
          const resolved = resolveFromSubscription(sub);

          // Update subscription
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              status: "active",
              currentPeriodEnd: periodEnd,
              ...(resolved ? { plan: resolved.plan, stripePriceId: resolved.priceId } : {}),
            },
          });

          // Extend license
          await prisma.license.updateMany({
            where: { stripeSubId: subscriptionId },
            data: {
              status: "active",
              expiresAt: periodEnd,
              ...(resolved ? { plan: resolved.plan, features: getFeaturesForPlan(resolved.plan) } : {}),
            },
          });

          console.log("[WEBHOOK] ✅ Renewed until:", periodEnd.toISOString());
        } catch (e) {
          console.error("[WEBHOOK] Failed to process renewal:", e);
        }
        break;
      }

      // ─── INVOICE FAILED ────────────────────────────────────
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

      // ─── SUBSCRIPTION UPDATED (plan change, cancel scheduled) ──
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        console.log("[WEBHOOK] customer.subscription.updated:", sub.id, "status:", sub.status);

        const periodEnd = new Date(sub.current_period_end * 1000);
        const resolved = resolveFromSubscription(sub);
        const cancelAt = sub.cancel_at ? new Date(sub.cancel_at * 1000) : null;

        // Map Stripe status to our status
        let ourStatus = "active";
        if (sub.status === "past_due") ourStatus = "past_due";
        else if (sub.status === "canceled" || sub.status === "unpaid") ourStatus = "canceled";
        else if (sub.status === "incomplete" || sub.status === "incomplete_expired") ourStatus = "incomplete";

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            status: ourStatus,
            currentPeriodEnd: periodEnd,
            cancelAt,
            ...(resolved ? { plan: resolved.plan, stripePriceId: resolved.priceId, productCode: resolved.productCode } : {}),
          },
        });

        // Sync license status
        let licenseStatus = "active";
        if (ourStatus === "canceled") licenseStatus = "expired";
        else if (ourStatus === "past_due") licenseStatus = "suspended";

        const licenseUpdate: Record<string, unknown> = {
          status: licenseStatus,
          expiresAt: periodEnd,
        };

        if (resolved) {
          licenseUpdate.plan = resolved.plan;
          licenseUpdate.features = getFeaturesForPlan(resolved.plan);
        }

        await prisma.license.updateMany({
          where: { stripeSubId: sub.id },
          data: licenseUpdate,
        });

        console.log("[WEBHOOK] ✅ Subscription updated: status=", ourStatus, "plan=", resolved?.plan);
        break;
      }

      // ─── SUBSCRIPTION DELETED ──────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        console.log("[WEBHOOK] customer.subscription.deleted:", sub.id);

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { status: "canceled" },
        });

        await prisma.license.updateMany({
          where: { stripeSubId: sub.id },
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
