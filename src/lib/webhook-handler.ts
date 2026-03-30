import { prisma } from "@/lib/prisma";
import { getStripe, resolveFromSubscription } from "@/lib/stripe";
import { generateLicenseKey } from "@/lib/license";
import { sendWelcomeEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import Stripe from "stripe";

// ── Helpers ───────────────────────────────────────────────

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pw = "";
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

// ── Race-safe user creation ──────────────────────────────
// If two webhooks fire concurrently for the same email, the second
// one catches the P2002 unique violation and fetches the existing user.

export async function ensureUserExists(
  email: string,
  stripeCustomerId?: string
): Promise<{ userId: number; plainPassword: string | null; isNew: boolean }> {
  const cleanEmail = email.toLowerCase().trim();

  let user = await prisma.user.findUnique({ where: { email: cleanEmail } });

  if (user) {
    if (stripeCustomerId && !user.stripeCustomerId) {
      try {
        await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId } });
      } catch { /* non-critical */ }
    }
    console.log("[WEBHOOK] User exists:", cleanEmail, "id:", user.id);
    return { userId: user.id, plainPassword: null, isNew: false };
  }

  const plainPassword = generatePassword();
  const hashedPassword = await bcrypt.hash(plainPassword, 12);

  try {
    user = await prisma.user.create({
      data: {
        email: cleanEmail,
        password: hashedPassword,
        role: "client",
        stripeCustomerId: stripeCustomerId || null,
      },
    });
    console.log("[WEBHOOK] ✅ User CREATED:", cleanEmail, "id:", user.id);
    return { userId: user.id, plainPassword, isNew: true };
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr.code === "P2002") {
      console.log("[WEBHOOK] ⚡ Race condition handled — user already exists");
      user = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (user) return { userId: user.id, plainPassword: null, isNew: false };
    }
    throw err;
  }
}

// ── Auto-create product if missing ───────────────────────

const PRODUCT_NAMES: Record<string, string> = {
  BOOKING_SYSTEM: "Booking System",
  CHATBOT_AI: "Chatbot AI",
};

async function ensureProduct(productCode: string) {
  const code = productCode.toUpperCase();
  return prisma.product.upsert({
    where: { code },
    update: {},
    create: { name: PRODUCT_NAMES[code] || code, code },
  });
}

// ── CHECKOUT COMPLETED ───────────────────────────────────

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("[WEBHOOK] ── checkout.session.completed:", session.id);

  const email = session.customer_email || session.customer_details?.email || "";
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const metadata = session.metadata || {};
  const productCode = metadata.productCode || "BOOKING_SYSTEM";
  const plan = metadata.plan || "basic";
  const domain = metadata.domain || "PENDING";

  if (!email) {
    console.error("[WEBHOOK] ❌ No email in session:", session.id);
    return;
  }

  console.log("[WEBHOOK] Email:", email, "| Product:", productCode, "| Plan:", plan);

  // Idempotency
  if (subscriptionId) {
    const existing = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });
    if (existing) {
      console.log("[WEBHOOK] ⚠️ Already processed:", subscriptionId);
      return;
    }
  }

  // 1. User
  const { userId, plainPassword, isNew } = await ensureUserExists(email, customerId);
  console.log("[WEBHOOK] ✅ User:", userId, isNew ? "(NEW)" : "(existing)");

  // 2. Subscription period from Stripe
  let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  let stripePriceId: string | null = null;
  if (subscriptionId) {
    try {
      const stripe = await getStripe();
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      periodEnd = new Date(sub.current_period_end * 1000);
      stripePriceId = sub.items?.data?.[0]?.price?.id || null;
    } catch (e) {
      console.warn("[WEBHOOK] Could not fetch sub details:", e);
    }
  }

  // 3. Product (auto-creates if missing)
  const product = await ensureProduct(productCode);
  console.log("[WEBHOOK] ✅ Product:", product.code, "id:", product.id);

  // 4. License
  const licenseKey = generateLicenseKey();
  const license = await prisma.license.create({
    data: {
      key: licenseKey,
      domain,
      status: "active",
      plan,
      features: [],
      email,
      userId,
      domainLocked: domain !== "PENDING",
      stripeSubId: subscriptionId || null,
      expiresAt: periodEnd,
      productId: product.id,
    },
  });
  console.log("[WEBHOOK] ✅ License CREATED:", license.key);

  // 5. Subscription
  if (subscriptionId) {
    await prisma.subscription.upsert({
      where: { stripeSubscriptionId: subscriptionId },
      update: {
        status: "active", plan, productCode, productId: product.id,
        currentPeriodEnd: periodEnd, stripeCustomerId: customerId,
        stripePriceId, licenseId: license.id, userId,
      },
      create: {
        email, userId, stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId, stripePriceId,
        status: "active", plan, productCode, productId: product.id,
        currentPeriodEnd: periodEnd, licenseId: license.id,
      },
    });
    console.log("[WEBHOOK] ✅ Subscription CREATED for user:", userId);
  }

  // 6. Email — send for ALL purchases
  try {
    const sent = await sendWelcomeEmail({
      email,
      password: isNew && plainPassword ? plainPassword : "(użyj istniejącego hasła)",
      licenseKey: license.key,
      domain,
      plan,
      productName: product.name,
    });
    console.log("[WEBHOOK]", sent ? "✅ Email SENT" : "⚠️ Email skipped (no RESEND_API_KEY)");
  } catch (emailErr) {
    console.error("[WEBHOOK] ⚠️ Email failed (non-fatal):", emailErr);
  }

  console.log("[WEBHOOK] ✅ Checkout DONE for:", email);
}

// ── SUBSCRIPTION CREATED ─────────────────────────────────

export async function handleSubscriptionCreated(sub: Stripe.Subscription) {
  console.log("[WEBHOOK] ── customer.subscription.created:", sub.id);

  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: sub.id },
  });

  if (existing) {
    console.log("[WEBHOOK] ℹ️ Already processed — syncing status");
    await prisma.subscription.update({
      where: { stripeSubscriptionId: sub.id },
      data: {
        status: sub.status === "active" || sub.status === "trialing" ? "active" : "incomplete",
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      },
    });
    return;
  }

  const customerId = sub.customer as string;
  const resolved = await resolveFromSubscription(sub);
  const periodEnd = new Date(sub.current_period_end * 1000);

  let email = "";
  try {
    const stripe = await getStripe();
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !customer.deleted) email = (customer as Stripe.Customer).email || "";
  } catch (e) {
    console.error("[WEBHOOK] Failed to fetch customer:", e);
  }

  if (!email) {
    console.warn("[WEBHOOK] ⚠️ No email for customer:", customerId);
    return;
  }

  const { userId } = await ensureUserExists(email, customerId);
  const plan = resolved?.plan || "basic";
  const productCode = resolved?.productCode || "BOOKING_SYSTEM";
  const product = await ensureProduct(productCode);

  const license = await prisma.license.create({
    data: {
      key: generateLicenseKey(), domain: "PENDING", status: "active",
      plan, features: [], email, userId, domainLocked: false,
      stripeSubId: sub.id, expiresAt: periodEnd, productId: product.id,
    },
  });

  await prisma.subscription.create({
    data: {
      email, userId, stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id, stripePriceId: resolved?.priceId || null,
      status: sub.status === "active" || sub.status === "trialing" ? "active" : "incomplete",
      plan, productCode, productId: product.id,
      currentPeriodEnd: periodEnd, licenseId: license.id,
    },
  });

  console.log("[WEBHOOK] ✅ Sub + license CREATED for:", email);
}

// ── SUBSCRIPTION UPDATED ─────────────────────────────────

export async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
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
      status: ourStatus, currentPeriodEnd: periodEnd, cancelAt,
      ...(resolved ? { plan: resolved.plan, stripePriceId: resolved.priceId, productCode: resolved.productCode } : {}),
    },
  });

  let licStatus = "active";
  if (ourStatus === "canceled") licStatus = "expired";
  else if (ourStatus === "past_due") licStatus = "suspended";

  const licData: Record<string, unknown> = { status: licStatus, expiresAt: periodEnd };
  if (resolved) { licData.plan = resolved.plan; licData.features = []; }

  await prisma.license.updateMany({ where: { stripeSubId: sub.id }, data: licData });
  console.log("[WEBHOOK] ✅ Sub UPDATED:", sub.id, "→", ourStatus);
}

// ── SUBSCRIPTION DELETED ─────────────────────────────────

export async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  await prisma.subscription.updateMany({ where: { stripeSubscriptionId: sub.id }, data: { status: "canceled" } });
  await prisma.license.updateMany({ where: { stripeSubId: sub.id }, data: { status: "expired" } });
  console.log("[WEBHOOK] ✅ Sub CANCELED, license EXPIRED:", sub.id);
}

// ── INVOICE PAID ─────────────────────────────────────────

export async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  try {
    const stripe = await getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const periodEnd = new Date(sub.current_period_end * 1000);
    const resolved = await resolveFromSubscription(sub);

    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: "active", currentPeriodEnd: periodEnd, ...(resolved ? { plan: resolved.plan, stripePriceId: resolved.priceId } : {}) },
    });
    await prisma.license.updateMany({
      where: { stripeSubId: subscriptionId },
      data: { status: "active", expiresAt: periodEnd, ...(resolved ? { plan: resolved.plan, features: [] } : {}) },
    });
    console.log("[WEBHOOK] ✅ RENEWED until:", periodEnd.toISOString());
  } catch (e) {
    console.error("[WEBHOOK] Renewal error:", e);
  }
}

// ── INVOICE FAILED ───────────────────────────────────────

export async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  await prisma.subscription.updateMany({ where: { stripeSubscriptionId: subscriptionId }, data: { status: "past_due" } });
  await prisma.license.updateMany({ where: { stripeSubId: subscriptionId }, data: { status: "suspended" } });
  console.log("[WEBHOOK] ✅ License SUSPENDED — payment failed");
}
