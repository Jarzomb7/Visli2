import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, getWebhookSecret, getFeaturesForPlan, resolveFromSubscription } from "@/lib/stripe";
import { generateLicenseKey } from "@/lib/license";
import { sendWelcomeEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pw = "";
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

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
    console.log("[WEBHOOK] ✅ User created:", cleanEmail, "id:", user.id);
    return { userId: user.id, plainPassword, isNew: true };
  }

  if (stripeCustomerId && !user.stripeCustomerId) {
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId } });
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
      console.error("[WEBHOOK] ❌ STRIPE_WEBHOOK_SECRET not configured");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }
    event = stripeClient.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("[WEBHOOK] ❌ Signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  console.log("[WEBHOOK] Event:", event.type, "ID:", event.id);

  try {
    switch (event.type) {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // CHECKOUT COMPLETED
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
          console.error("[WEBHOOK] ❌ No email in session:", session.id);
          break;
        }

        console.log("[WEBHOOK] Email:", email, "Product:", productCode, "Plan:", plan, "Domain:", domain);

        // Idempotency — skip if subscription already processed
        if (subscriptionId) {
          const existing = await prisma.subscription.findUnique({
            where: { stripeSubscriptionId: subscriptionId },
          });
          if (existing) {
            console.log("[WEBHOOK] ⚠️ Already processed sub:", subscriptionId, "— skipping");
            break;
          }
        }

        // 1. User
        const { userId, plainPassword, isNew } = await ensureUserExists(email, customerId);
        console.log("[WEBHOOK] User:", userId, isNew ? "(NEW)" : "(existing)");

        // 2. Fetch subscription period from Stripe
        let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        let stripePriceId: string | null = null;
        if (subscriptionId) {
          try {
            const stripeApi = await getStripe();
            const sub = await stripeApi.subscriptions.retrieve(subscriptionId);
            periodEnd = new Date(sub.current_period_end * 1000);
            stripePriceId = sub.items?.data?.[0]?.price?.id || null;
          } catch (e) {
            console.error("[WEBHOOK] Failed to fetch sub:", e);
          }
        }

        // 3. Product
        const product = await prisma.product.findUnique({ where: { code: productCode } });

        // 4. License
        const features = getFeaturesForPlan(plan);
        const license = await prisma.license.create({
          data: {
            key: generateLicenseKey(),
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
        console.log("[WEBHOOK] ✅ License created:", license.key, "for:", email);

        // 5. Subscription
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
          console.log("[WEBHOOK] ✅ Subscription created for user:", userId);
        }

        // 6. Welcome email (new users only — has generated password)
        if (isNew && plainPassword) {
          console.log("[WEBHOOK] 📧 Sending welcome email to:", email);
          const sent = await sendWelcomeEmail({
            email,
            password: plainPassword,
            licenseKey: license.key,
            domain,
            plan,
            productName: product?.name || productCode,
          });
          console.log("[WEBHOOK]", sent ? "✅ Email sent" : "⚠️ Email skipped (SMTP not configured)");
        }

        console.log("[WEBHOOK] ✅ Checkout fully processed for:", email);
        break;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // SUBSCRIPTION CREATED
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        console.log("[WEBHOOK] customer.subscription.created:", sub.id);

        const existing = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: sub.id },
        });

        if (existing) {
          console.log("[WEBHOOK] ℹ️ Sub already exists — syncing status");
          await prisma.subscription.update({
            where: { stripeSubscriptionId: sub.id },
            data: {
              status: sub.status === "active" || sub.status === "trialing" ? "active" : "incomplete",
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            },
          });
          break;
        }

        // Rare: subscription event arrived before/without checkout event
        const customerId = sub.customer as string;
        const resolved = await resolveFromSubscription(sub);
        const periodEnd = new Date(sub.current_period_end * 1000);

        let email = "";
        try {
          const stripeApi = await getStripe();
          const customer = await stripeApi.customers.retrieve(customerId);
          if (customer && !customer.deleted) email = customer.email || "";
        } catch (e) {
          console.error("[WEBHOOK] Failed to fetch customer:", e);
        }

        if (email) {
          const { userId } = await ensureUserExists(email, customerId);
          const plan = resolved?.plan || "basic";
          const product = resolved ? await prisma.product.findUnique({ where: { code: resolved.productCode } }) : null;

          const license = await prisma.license.create({
            data: {
              key: generateLicenseKey(),
              domain: "PENDING",
              status: "active",
              plan,
              features: getFeaturesForPlan(plan),
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
          console.log("[WEBHOOK] ✅ Sub + license created from subscription.created for:", email);
        }
        break;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // SUBSCRIPTION UPDATED
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const periodEnd = new Date(sub.current_period_end * 1000);
        const resolved = await resolveFromSubscription(sub);
        const cancelAt = sub.cancel_at ? new Date(sub.cancel_at * 1000) : null;

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

        let licenseStatus = "active";
        if (ourStatus === "canceled") licenseStatus = "expired";
        else if (ourStatus === "past_due") licenseStatus = "suspended";

        const licUpdate: Record<string, unknown> = { status: licenseStatus, expiresAt: periodEnd };
        if (resolved) {
          licUpdate.plan = resolved.plan;
          licUpdate.features = getFeaturesForPlan(resolved.plan);
        }

        await prisma.license.updateMany({ where: { stripeSubId: sub.id }, data: licUpdate });
        console.log("[WEBHOOK] ✅ Sub updated:", sub.id, "→", ourStatus);
        break;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // SUBSCRIPTION DELETED
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({ where: { stripeSubscriptionId: sub.id }, data: { status: "canceled" } });
        await prisma.license.updateMany({ where: { stripeSubId: sub.id }, data: { status: "expired" } });
        console.log("[WEBHOOK] ✅ Sub canceled, license expired:", sub.id);
        break;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // INVOICE PAID — renewals
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

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
              ...(resolved ? { plan: resolved.plan, features: getFeaturesForPlan(resolved.plan) } : {}),
            },
          });
          console.log("[WEBHOOK] ✅ Renewed until:", periodEnd.toISOString());
        } catch (e) {
          console.error("[WEBHOOK] Renewal error:", e);
        }
        break;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // INVOICE PAYMENT FAILED
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        await prisma.subscription.updateMany({ where: { stripeSubscriptionId: subscriptionId }, data: { status: "past_due" } });
        await prisma.license.updateMany({ where: { stripeSubId: subscriptionId }, data: { status: "suspended" } });
        console.log("[WEBHOOK] ✅ License suspended — payment failed");
        break;
      }

      default:
        console.log("[WEBHOOK] Unhandled:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[WEBHOOK] ❌ Handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
