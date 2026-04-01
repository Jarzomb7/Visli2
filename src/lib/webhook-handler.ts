import { prisma } from "@/lib/prisma";
import { getStripe, resolveFromSubscription } from "@/lib/stripe";
import {
sendCancellationEmail,
sendPaymentFailedEmail,
sendPaymentSuccessEmail,
sendRenewalReminderEmail,
sendWelcomeEmail,
} from "@/lib/email";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import { ensureProductExists } from "@/lib/products";
import { findOrCreateLicense, syncLicenseFromSubscription } from "@/lib/licensing";
import { upsertSubscriptionRecord, updateSubscriptionStatus } from "@/lib/billing";
import { resolvePlanByPriceId, supportsProduct } from "@/lib/plans";

function generatePassword(): string {
const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
let password = "";
for (let i = 0; i < 12; i++) {
password += chars[Math.floor(Math.random() * chars.length)];
}
return password;
}

async function ensureUserExists(
email: string,
stripeCustomerId?: string,
): Promise<{ userId: number; plainPassword: string | null; isNew: boolean }> {
const cleanEmail = email.toLowerCase().trim();
let user = await prisma.user.findUnique({ where: { email: cleanEmail } });

if (user) {
if (stripeCustomerId && !user.stripeCustomerId) {
try {
await prisma.user.update({
where: { id: user.id },
data: { stripeCustomerId },
});
} catch {}
}
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
return { userId: user.id, plainPassword, isNew: true };
} catch (err: unknown) {
if ((err as { code?: string }).code === "P2002") {
user = await prisma.user.findUnique({ where: { email: cleanEmail } });
if (user) {
if (stripeCustomerId && !user.stripeCustomerId) {
try {
await prisma.user.update({
where: { id: user.id },
data: { stripeCustomerId },
});
} catch {}
}
return { userId: user.id, plainPassword: null, isNew: false };
}
}
throw err;
}
}

async function resolveCheckoutPlan(priceId: string | null, fallbackPlan?: string): Promise<string> {
if (priceId) {
const mapped = await resolvePlanByPriceId(priceId);
if (mapped) return mapped.planName.toLowerCase();
}
return fallbackPlan?.toLowerCase() || "basic";
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
const email = session.customer_email || session.customer_details?.email || "";
const customerId = session.customer as string;
const subscriptionId = session.subscription as string;
const metadata = session.metadata || {};
const productCode = (metadata.productCode || "BOOKING_SYSTEM").toUpperCase();
const domain = metadata.domain || "PENDING";

if (!email || !subscriptionId) return;

const existing = await prisma.subscription.findUnique({
where: { stripeSubscriptionId: subscriptionId },
});
if (existing) return;

const { userId, plainPassword, isNew } = await ensureUserExists(email, customerId);

let periodEnd = new Date(Date.now() + 30 * 86400000);
let stripePriceId: string | null = null;
try {
const stripeSub = await (await getStripe()).subscriptions.retrieve(subscriptionId);
periodEnd = new Date(stripeSub.current_period_end * 1000);
stripePriceId = stripeSub.items?.data?.[0]?.price?.id || null;
} catch {}

const plan = await resolveCheckoutPlan(stripePriceId, metadata.plan);
const product = await ensureProductExists(productCode);

const planMapping = stripePriceId ? await resolvePlanByPriceId(stripePriceId) : null;
if (planMapping && !supportsProduct(planMapping, productCode)) {
console.warn("[WEBHOOK] plan/product mismatch", { plan: planMapping.planName, productCode });
}

const license = await findOrCreateLicense({
subscriptionId,
email,
productId: product.id,
plan,
expiresAt: periodEnd,
domain,
});

await upsertSubscriptionRecord({
stripeSubscriptionId: subscriptionId,
email,
userId,
stripeCustomerId: customerId,
stripePriceId,
status: "active",
plan,
productCode,
productId: product.id,
currentPeriodEnd: periodEnd,
licenseId: license.id,
});

if (isNew && plainPassword) {
await sendWelcomeEmail({
email,
password: plainPassword,
licenseKey: license.key,
domain,
plan,
productName: product.name,
});
}
}

export async function handleSubscriptionCreated(sub: Stripe.Subscription) {
const existing = await prisma.subscription.findUnique({
where: { stripeSubscriptionId: sub.id },
});
if (existing) {
await updateSubscriptionStatus({
stripeSubscriptionId: sub.id,
status: sub.status === "active" || sub.status === "trialing" ? "active" : "incomplete",
currentPeriodEnd: new Date(sub.current_period_end * 1000),
});
return;
}

const customerId = sub.customer as string;
const resolved = await resolveFromSubscription(sub);
const periodEnd = new Date(sub.current_period_end * 1000);

let email = "";
try {
const customer = await (await getStripe()).customers.retrieve(customerId);
if (customer && !customer.deleted) email = (customer as Stripe.Customer).email || "";
} catch {}

if (!email) return;

const { userId } = await ensureUserExists(email, customerId);
const product = await ensureProductExists(resolved?.productCode || "BOOKING_SYSTEM");
const plan = await resolveCheckoutPlan(resolved?.priceId || null, resolved?.plan || "basic");

const license = await findOrCreateLicense({
subscriptionId: sub.id,
email,
productId: product.id,
plan,
expiresAt: periodEnd,
domain: "PENDING",
});

await upsertSubscriptionRecord({
stripeSubscriptionId: sub.id,
email,
userId,
stripeCustomerId: customerId,
stripePriceId: resolved?.priceId || null,
status: sub.status === "active" || sub.status === "trialing" ? "active" : "incomplete",
plan,
productCode: resolved?.productCode || product.code,
productId: product.id,
currentPeriodEnd: periodEnd,
licenseId: license.id,
});
}

export async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
const periodEnd = new Date(sub.current_period_end * 1000);
const resolved = await resolveFromSubscription(sub);
const cancelAt = sub.cancel_at ? new Date(sub.cancel_at * 1000) : null;
const resolvedPlan = await resolveCheckoutPlan(resolved?.priceId || null, resolved?.plan);

let status = "active";
if (sub.status === "past_due") status = "past_due";
else if (sub.status === "canceled" || sub.status === "unpaid") status = "canceled";
else if (sub.status === "incomplete" || sub.status === "incomplete_expired") status = "incomplete";

await updateSubscriptionStatus({
stripeSubscriptionId: sub.id,
status,
currentPeriodEnd: periodEnd,
cancelAt,
...(resolved
? {
plan: resolvedPlan,
stripePriceId: resolved.priceId,
productCode: resolved.productCode,
}
: {}),
});

const licenseStatus = status === "canceled" ? "expired" : status === "past_due" ? "suspended" : "active";
await syncLicenseFromSubscription({
subscriptionId: sub.id,
plan: resolvedPlan || "basic",
expiresAt: periodEnd,
status: licenseStatus,
});

if (cancelAt) {
const subscription = await prisma.subscription.findFirst({
where: { stripeSubscriptionId: sub.id },
include: { product: { select: { name: true } } },
});

if (subscription) {
  await sendRenewalReminderEmail({
    email: subscription.email,
    plan: subscription.plan,
    productName: subscription.product?.name || subscription.productCode || "VISLI",
    renewalDate: subscription.currentPeriodEnd,
  });
}
}
}

export async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
await updateSubscriptionStatus({ stripeSubscriptionId: sub.id, status: "canceled" });
await prisma.license.updateMany({ where: { stripeSubId: sub.id }, data: { status: "expired" } });

const subscription = await prisma.subscription.findFirst({
where: { stripeSubscriptionId: sub.id },
include: { product: { select: { name: true } } },
});

if (subscription) {
await sendCancellationEmail({
email: subscription.email,
plan: subscription.plan,
productName: subscription.product?.name || subscription.productCode || "VISLI",
renewalDate: subscription.currentPeriodEnd,
});
}
}

export async function handleInvoicePaid(invoice: Stripe.Invoice) {
const subId = invoice.subscription as string;
if (!subId) return;

try {
const stripeSub = await (await getStripe()).subscriptions.retrieve(subId);
const end = new Date(stripeSub.current_period_end * 1000);
const resolved = await resolveFromSubscription(stripeSub);
const resolvedPlan = await resolveCheckoutPlan(resolved?.priceId || null, resolved?.plan);

await updateSubscriptionStatus({
  stripeSubscriptionId: subId,
  status: "active",
  currentPeriodEnd: end,
  ...(resolved
    ? {
        plan: resolvedPlan,
        stripePriceId: resolved.priceId,
        productCode: resolved.productCode,
      }
    : {}),
});

await syncLicenseFromSubscription({
  subscriptionId: subId,
  plan: resolvedPlan || "basic",
  expiresAt: end,
  status: "active",
});

const subscription = await prisma.subscription.findFirst({
  where: { stripeSubscriptionId: subId },
  include: { product: { select: { name: true } } },
});

if (subscription) {
  await sendPaymentSuccessEmail({
    email: subscription.email,
    plan: subscription.plan,
    productName: subscription.product?.name || subscription.productCode || "VISLI",
    renewalDate: subscription.currentPeriodEnd,
  });
}
} catch (err) {
console.error("[WEBHOOK] invoice paid handler error:", err);
}
}

export async function handleInvoiceFailed(invoice: Stripe.Invoice) {
const subId = invoice.subscription as string;
if (!subId) return;

await updateSubscriptionStatus({ stripeSubscriptionId: subId, status: "past_due" });
await prisma.license.updateMany({ where: { stripeSubId: subId }, data: { status: "suspended" } });

const subscription = await prisma.subscription.findFirst({
where: { stripeSubscriptionId: subId },
include: { product: { select: { name: true } } },
});

if (subscription) {
await sendPaymentFailedEmail({
email: subscription.email,
plan: subscription.plan,
productName: subscription.product?.name || subscription.productCode || "VISLI",
renewalDate: subscription.currentPeriodEnd,
});
}
}