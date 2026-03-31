import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, getWebhookSecret, resolveFromSubscription } from "@/lib/stripe";
import { generateLicenseKey } from "@/lib/license";
import { sendWelcomeEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// Generate a secure readable password (12 chars, mixed)
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

/**
 * Ensure user exists in DB. Returns { userId, plainPassword, isNew }.
 * plainPassword is non-null only when a NEW user was created (for welcome email).
 */
async function ensureUserExists(
  email: string,
  stripeCustomerId?: string
): Promise<{ userId: number; plainPassword: string | null; isNew: boolean }> {
  const cleanEmail = email.toLowerCase().trim();
  let user = await prisma.user.findUnique({ where: { email: cleanEmail } });

  if (!user) {
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 12);
    user = await prisma.user.create({
      data: {
        email: cleanEmail,
        password: hashedPassword,
        role: "client",
        stripeCustomerId: stripeCustomerId || null,
      },
    });
    console.log("[WEBHOOK] ✅ Auto-created user:", cleanEmail, "id:", user.id);
    return { userId: user.id, plainPassword, isNew: true };
  }

  // Update stripeCustomerId if missing
  if (stripeCustomerId && !user.stripeCustomerId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId },
    });
    console.log("[WEBHOOK] Updated stripeCustomerId for user:", user.id);
  }

  return { userId: user.id, plainPassword: null, isNew: false };
}

export async function POST(request: NextRequest) {
  console.log("[WEBHOOK] ===== Stripe webhook received =====");

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    console.error("[WEBHOOK] ❌ Missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripeClient = await getStripe();
    const webhookSecret = await getWebhookSecret();

    if (!webhookSecret) {
      console.error("[WEBHOOK] ❌ STRIPE_WEBHOOK_SECRET is not configured");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    event = stripeClient.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("[WEBHOOK] ❌ Signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  console.log("[WEBHOOK] Event type:", event.type, "ID:", event.id);

  try {
    switch (event.type) {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // CHECKOUT COMPLETED — main entry point for new purchases
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
          console.error("[WEBHOOK] ❌ No email found in checkout session:", session.id);
          break;
        }

        console.log("[WEBHOOK] Processing checkout for:", email, "product:", productCode, "plan:", plan, "domain:", domain);

        // Idempotency check — skip if subscription already exists in our DB
        if (subscriptionId) {
          const existingSub = await prisma.subscription.findUnique({
            where: { stripeSubscriptionId: subscriptionId },
          });
          if (existingSub) {
            console.log("[WEBHOOK] ⚠️ Subscription already exists for:", subscriptionId, "— skipping duplicate");
            break;
          }
        }

        // 1. Create or get user
        const { userId, plainPassword, isNew } = await ensureUserExists(email, customerId);
        console.log("[WEBHOOK] User:", userId, isNew ? "(NEW)" : "(existing)");

        // 2. Fetch subscription details from Stripe
        let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        let stripePriceId: string | null = null;
        if (subscriptionId) {
          try {
            const stripeApi = await getStripe();
            const sub = await stripeApi.subscriptions.retrieve(subscriptionId);
            periodEnd = new Date(sub.current_period_end * 1000);
            stripePriceId = sub.items?.data?.[0]?.price?.id || null;
            console.log("[WEBHOOK] Stripe sub period end:", periodEnd.toISOString(), "priceId:", stripePriceId);
          } catch (e) {
            console.error("[WEBHOOK] Failed to fetch subscription from Stripe:", e);
          }
        }

        // 3. Resolve product from DB
        const product = await prisma.product.findUnique({ where: { code: productCode } });
        if (!product) {
          console.warn("[WEBHOOK] ⚠️ Product not found for code:", productCode, "— license will have no productId");
        }

        // 4. Create license
        const features: string[] = [];
        const licenseKey = generateLicenseKey();
        const license = await prisma.license.create({
          data: {
            key: licenseKey,
            domain,
            status: "active",
            plan,
            features,
            email,
            domainLocked: domain !== "PENDING",
            stripeSubId: subscriptionId || null,
            expiresAt: periodEnd,
            productId: product?.id || null,
          },
        });
        console.log("[WEBHOOK] ✅ License created:", license.key, "id:", license.id, "for:", email);

        // 5. Create subscription record
        if (subscriptionId) {
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
              userId,
            },
            create: {
              email,
              userId,
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
          console.log("[WEBHOOK] ✅ Subscription created for user:", userId, "license:", license.id);
        }

        // 6. Send welcome email (only for new users — includes generated password)
        if (isNew && plainPassword) {
          console.log("[WEBHOOK] 📧 Sending welcome email to:", email);
          const emailSent = await sendWelcomeEmail({
            email,
            password: plainPassword,
            licenseKey: license.key,
            domain,
            plan,
            productName: product?.name || productCode,
          });
          console.log("[WEBHOOK]", emailSent ? "✅ Welcome email sent" : "⚠️ Welcome email skipped (SMTP not configured)");
        } else {
          console.log("[WEBHOOK] ℹ️ Existing user — skipping welcome email");
        }

        console.log("[WEBHOOK] ✅ checkout.session.completed fully processed for:", email);
        break;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // SUBSCRIPTION CREATED — fired by Stripe after checkout
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        console.log("[WEBHOOK] customer.subscription.created:", sub.id, "status:", sub.status);

        // Check if already processed via checkout.session.completed
        const existingSub = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: sub.id },
        });

        if (existingSub) {
          console.log("[WEBHOOK] ℹ️ Subscription already exists (processed via checkout) — syncing status");
          const newStatus = sub.status === "active" || sub.status === "trialing" ? "active" : "incomplete";
          await prisma.subscription.update({
            where: { stripeSubscriptionId: sub.id },
            data: {
              status: newStatus,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            },
          });
          break;
        }

        // If NOT yet processed via checkout (edge case), handle it now
        const customerId = sub.customer as string;
        const resolved = await resolveFromSubscription(sub);
        const periodEnd = new Date(sub.current_period_end * 1000);

        // Fetch customer email from Stripe
        let email = "";
        try {
          const stripeApi = await getStripe();
          const customer = await stripeApi.customers.retrieve(customerId);
          if (customer && !customer.deleted) {
            email = customer.email || "";
          }
        } catch (e) {
          console.error("[WEBHOOK] Failed to fetch customer:", e);
        }

        if (email) {
          const { userId } = await ensureUserExists(email, customerId);
          const plan = resolved?.plan || "basic";
          const product = resolved ? await prisma.product.findUnique({ where: { code: resolved.productCode } }) : null;
          const features: string[] = [];

          const license = await prisma.license.create({
            data: {
              key: generateLicenseKey(),
              domain: "PENDING",
              status: "active",
              plan,
              features,
              email,
              domainLocked: false,
              stripeSubId: sub.id,
              expiresAt: periodEnd,
              productId: product?.id || null,
            },
          });

          await prisma.subscription.create({
            data: {
              email,
              userId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: sub.id,
              stripePriceId: resolved?.priceId || null,
              status: sub.status === "active" || sub.status === "trialing" ? "active" : "incomplete",
              plan,
              productCode: resolved?.productCode || null,
              productId: product?.id || null,
              currentPeriodEnd: periodEnd,
              licenseId: license.id,
            },
          });
          console.log("[WEBHOOK] ✅ Subscription + license created from subscription.created for:", email);
        } else {
          console.warn("[WEBHOOK] ⚠️ Could not resolve email for customer:", customerId);
        }
        break;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // SUBSCRIPTION UPDATED — plan change, status change, etc.
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const periodEnd = new Date(sub.current_period_end * 1000);
        const resolved = await resolveFromSubscription(sub);
        const cancelAt = sub.cancel_at ? new Date(sub.cancel_at * 1000) : null;

        console.log("[WEBHOOK] customer.subscription.updated:", sub.id, "stripe status:", sub.status);

        let ourStatus = "active";
        if (sub.status === "past_due") ourStatus = "past_due";
        else if (sub.status === "canceled" || sub.status === "unpaid") ourStatus = "canceled";
        else if (sub.status === "incomplete" || sub.status === "incomplete_expired") ourStatus = "incomplete";
        else if (sub.status === "trialing") ourStatus = "active";

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            status: ourStatus,
            currentPeriodEnd: periodEnd,
            cancelAt,
            ...(resolved ? { plan: resolved.plan, stripePriceId: resolved.priceId, productCode: resolved.productCode } : {}),
          },
        });

        let licenseStatus = "active";
        if (ourStatus === "canceled") licenseStatus = "expired";
        else if (ourStatus === "past_due") licenseStatus = "suspended";

        const licenseUpdate: Record<string, unknown> = { status: licenseStatus, expiresAt: periodEnd };
        if (resolved) {
          licenseUpdate.plan = resolved.plan;
          licenseUpdate.features = [] as string[];
        }

        await prisma.license.updateMany({
          where: { stripeSubId: sub.id },
          data: licenseUpdate,
        });

        console.log("[WEBHOOK] ✅ Subscription updated:", sub.id, "→", ourStatus);
        break;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // SUBSCRIPTION DELETED — cancel + expire license
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

        console.log("[WEBHOOK] ✅ Subscription canceled, license expired:", sub.id);
        break;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // INVOICE PAID — renewal / recurring payment success
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        console.log("[WEBHOOK] invoice.paid for sub:", subscriptionId);

        try {
          const stripeApi = await getStripe();
          const sub = await stripeApi.subscriptions.retrieve(subscriptionId);
          const periodEnd = new Date(sub.current_period_end * 1000);
          const resolved = await resolveFromSubscription(sub);

          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              status: "active",
              currentPeriodEnd: periodEnd,
              ...(resolved ? { plan: resolved.plan, stripePriceId: resolved.priceId } : {}),
            },
          });

          await prisma.license.updateMany({
            where: { stripeSubId: subscriptionId },
            data: {
              status: "active",
              expiresAt: periodEnd,
              ...(resolved ? { plan: resolved.plan, features: [] as string[] } : {}),
            },
          });

          console.log("[WEBHOOK] ✅ Renewed until:", periodEnd.toISOString());
        } catch (e) {
          console.error("[WEBHOOK] Failed to process renewal:", e);
        }
        break;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // INVOICE PAYMENT FAILED — suspend license
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        console.log("[WEBHOOK] invoice.payment_failed for sub:", subscriptionId);

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

      default:
        console.log("[WEBHOOK] Unhandled event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[WEBHOOK] ❌ Handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
