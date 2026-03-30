import { prisma } from "@/lib/prisma";
import { getStripe, resolveFromSubscription } from "@/lib/stripe";
import { generateLicenseKey } from "@/lib/license";
import { sendWelcomeEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import Stripe from "stripe";

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pw = "";
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

/** Race-safe: catches P2002 unique violation if two webhooks fire for same email */
async function ensureUserExists(
  email: string,
  stripeCustomerId?: string
): Promise<{ userId: number; plainPassword: string | null; isNew: boolean }> {
  const cleanEmail = email.toLowerCase().trim();
  let user = await prisma.user.findUnique({ where: { email: cleanEmail } });

  if (user) {
    if (stripeCustomerId && !user.stripeCustomerId) {
      try { await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId } }); } catch {}
    }
    return { userId: user.id, plainPassword: null, isNew: false };
  }

  const plainPassword = generatePassword();
  const hashed = await bcrypt.hash(plainPassword, 12);
  try {
    user = await prisma.user.create({
      data: { email: cleanEmail, password: hashed, role: "client", stripeCustomerId: stripeCustomerId || null },
    });
    console.log("[WEBHOOK] ✅ User CREATED:", cleanEmail, "id:", user.id);
    return { userId: user.id, plainPassword, isNew: true };
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      user = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (user) return { userId: user.id, plainPassword: null, isNew: false };
    }
    throw err;
  }
}

const PRODUCT_NAMES: Record<string, string> = { BOOKING_SYSTEM: "Booking System", CHATBOT_AI: "Chatbot AI" };

async function ensureProduct(code: string) {
  const c = code.toUpperCase();
  return prisma.product.upsert({ where: { code: c }, update: {}, create: { name: PRODUCT_NAMES[c] || c, code: c } });
}

// ── CHECKOUT COMPLETED ───────────────────────────────────

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("[WEBHOOK] checkout.session.completed:", session.id);
  const email = session.customer_email || session.customer_details?.email || "";
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const meta = session.metadata || {};
  const productCode = meta.productCode || "BOOKING_SYSTEM";
  const plan = meta.plan || "basic";
  const domain = meta.domain || "PENDING";

  if (!email) { console.error("[WEBHOOK] ❌ No email:", session.id); return; }
  console.log("[WEBHOOK] Email:", email, "Product:", productCode, "Plan:", plan);

  if (subscriptionId) {
    const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: subscriptionId } });
    if (existing) { console.log("[WEBHOOK] ⚠️ Already processed:", subscriptionId); return; }
  }

  const { userId, plainPassword, isNew } = await ensureUserExists(email, customerId);
  console.log("[WEBHOOK] ✅ User:", userId, isNew ? "(NEW)" : "(existing)");

  let periodEnd = new Date(Date.now() + 30 * 86400000);
  let stripePriceId: string | null = null;
  if (subscriptionId) {
    try {
      const s = await (await getStripe()).subscriptions.retrieve(subscriptionId);
      periodEnd = new Date(s.current_period_end * 1000);
      stripePriceId = s.items?.data?.[0]?.price?.id || null;
    } catch (e) { console.warn("[WEBHOOK] Sub fetch failed:", e); }
  }

  const product = await ensureProduct(productCode);

  const license = await prisma.license.create({
    data: {
      key: generateLicenseKey(), domain, status: "active", plan, features: [],
      email, domainLocked: domain !== "PENDING", stripeSubId: subscriptionId || null,
      expiresAt: periodEnd, productId: product.id,
    },
  });
  console.log("[WEBHOOK] ✅ License CREATED:", license.key);

  // Try to set userId (new column — safe if it doesn't exist yet)
  try { await prisma.license.update({ where: { id: license.id }, data: { userId } }); } catch {}

  if (subscriptionId) {
    await prisma.subscription.upsert({
      where: { stripeSubscriptionId: subscriptionId },
      update: { status: "active", plan, productCode, productId: product.id, currentPeriodEnd: periodEnd, stripeCustomerId: customerId, stripePriceId, licenseId: license.id, userId },
      create: { email, userId, stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, stripePriceId, status: "active", plan, productCode, productId: product.id, currentPeriodEnd: periodEnd, licenseId: license.id },
    });
    console.log("[WEBHOOK] ✅ Subscription CREATED");
  }

  try {
    const sent = await sendWelcomeEmail({
      email,
      password: isNew && plainPassword ? plainPassword : "(use existing password)",
      licenseKey: license.key, domain, plan, productName: product.name,
    });
    console.log("[WEBHOOK]", sent ? "✅ Email SENT" : "⚠️ Email skipped");
  } catch (e) { console.error("[WEBHOOK] Email failed (non-fatal):", e); }

  console.log("[WEBHOOK] ✅ DONE for:", email);
}

// ── SUBSCRIPTION CREATED ─────────────────────────────────

export async function handleSubscriptionCreated(sub: Stripe.Subscription) {
  console.log("[WEBHOOK] subscription.created:", sub.id);
  const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub.id } });
  if (existing) {
    await prisma.subscription.update({
      where: { stripeSubscriptionId: sub.id },
      data: { status: sub.status === "active" || sub.status === "trialing" ? "active" : "incomplete", currentPeriodEnd: new Date(sub.current_period_end * 1000) },
    });
    return;
  }

  const customerId = sub.customer as string;
  const resolved = await resolveFromSubscription(sub);
  const periodEnd = new Date(sub.current_period_end * 1000);
  let email = "";
  try {
    const c = await (await getStripe()).customers.retrieve(customerId);
    if (c && !c.deleted) email = (c as Stripe.Customer).email || "";
  } catch {}

  if (!email) return;
  const { userId } = await ensureUserExists(email, customerId);
  const plan = resolved?.plan || "basic";
  const product = await ensureProduct(resolved?.productCode || "BOOKING_SYSTEM");

  const license = await prisma.license.create({
    data: { key: generateLicenseKey(), domain: "PENDING", status: "active", plan, features: [], email, domainLocked: false, stripeSubId: sub.id, expiresAt: periodEnd, productId: product.id },
  });
  try { await prisma.license.update({ where: { id: license.id }, data: { userId } }); } catch {}

  await prisma.subscription.create({
    data: { email, userId, stripeCustomerId: customerId, stripeSubscriptionId: sub.id, stripePriceId: resolved?.priceId || null, status: sub.status === "active" || sub.status === "trialing" ? "active" : "incomplete", plan, productCode: resolved?.productCode || null, productId: product.id, currentPeriodEnd: periodEnd, licenseId: license.id },
  });
  console.log("[WEBHOOK] ✅ Sub+License CREATED for:", email);
}

// ── SUBSCRIPTION UPDATED ─────────────────────────────────

export async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const periodEnd = new Date(sub.current_period_end * 1000);
  const resolved = await resolveFromSubscription(sub);
  const cancelAt = sub.cancel_at ? new Date(sub.cancel_at * 1000) : null;

  let status = "active";
  if (sub.status === "past_due") status = "past_due";
  else if (sub.status === "canceled" || sub.status === "unpaid") status = "canceled";
  else if (sub.status === "incomplete" || sub.status === "incomplete_expired") status = "incomplete";

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: { status, currentPeriodEnd: periodEnd, cancelAt, ...(resolved ? { plan: resolved.plan, stripePriceId: resolved.priceId, productCode: resolved.productCode } : {}) },
  });

  let licStatus = "active";
  if (status === "canceled") licStatus = "expired";
  else if (status === "past_due") licStatus = "suspended";

  const licData: Record<string, unknown> = { status: licStatus, expiresAt: periodEnd };
  if (resolved) { licData.plan = resolved.plan; licData.features = []; }
  await prisma.license.updateMany({ where: { stripeSubId: sub.id }, data: licData });
  console.log("[WEBHOOK] ✅ Sub UPDATED:", sub.id, "→", status);
}

// ── SUBSCRIPTION DELETED ─────────────────────────────────

export async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  await prisma.subscription.updateMany({ where: { stripeSubscriptionId: sub.id }, data: { status: "canceled" } });
  await prisma.license.updateMany({ where: { stripeSubId: sub.id }, data: { status: "expired" } });
  console.log("[WEBHOOK] ✅ CANCELED:", sub.id);
}

// ── INVOICE PAID ─────────────────────────────────────────

export async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subId = invoice.subscription as string;
  if (!subId) return;
  try {
    const s = await (await getStripe()).subscriptions.retrieve(subId);
    const end = new Date(s.current_period_end * 1000);
    const r = await resolveFromSubscription(s);
    await prisma.subscription.updateMany({ where: { stripeSubscriptionId: subId }, data: { status: "active", currentPeriodEnd: end, ...(r ? { plan: r.plan, stripePriceId: r.priceId } : {}) } });
    await prisma.license.updateMany({ where: { stripeSubId: subId }, data: { status: "active", expiresAt: end, ...(r ? { plan: r.plan, features: [] } : {}) } });
    console.log("[WEBHOOK] ✅ RENEWED until:", end.toISOString());
  } catch (e) { console.error("[WEBHOOK] Renewal error:", e); }
}

// ── INVOICE FAILED ───────────────────────────────────────

export async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const subId = invoice.subscription as string;
  if (!subId) return;
  await prisma.subscription.updateMany({ where: { stripeSubscriptionId: subId }, data: { status: "past_due" } });
  await prisma.license.updateMany({ where: { stripeSubId: subId }, data: { status: "suspended" } });
  console.log("[WEBHOOK] ✅ SUSPENDED:", subId);
}
