import Stripe from "stripe";
import { getSetting } from "./settings";
import { prisma } from "./prisma";

const globalForStripe = globalThis as unknown as {
  _stripeClient: Stripe | undefined;
  _stripeKey: string | undefined;
};

export async function getStripe(): Promise<Stripe> {
  const envKey = process.env.STRIPE_SECRET_KEY;
  if (!envKey) throw new Error("[STRIPE] STRIPE_SECRET_KEY is required");

  const key = envKey || await getSetting("STRIPE_SECRET_KEY", "");

  if (globalForStripe._stripeClient && globalForStripe._stripeKey === key) {
    return globalForStripe._stripeClient;
  }
  globalForStripe._stripeClient = new Stripe(key, { typescript: true });
  globalForStripe._stripeKey = key;
  return globalForStripe._stripeClient;
}

export async function getWebhookSecret(): Promise<string> {
  const envSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!envSecret) throw new Error("[STRIPE] STRIPE_WEBHOOK_SECRET is required");

  return envSecret || await getSetting("STRIPE_WEBHOOK_SECRET", "");
}

export function resetStripeClient(): void {
  globalForStripe._stripeClient = undefined;
  globalForStripe._stripeKey = undefined;
}

export function isValidStripePriceId(val: string): boolean {
  return typeof val === "string" && val.startsWith("price_") && val.length > 10;
}

/**
 * Get price ID for a product — reads from Product.stripePriceId in DB.
 * Falls back to Settings for backward compatibility.
 */
export async function getPriceIdForProduct(productCode: string): Promise<string | null> {
  // Try Product model first
  const product = await prisma.product.findUnique({ where: { code: productCode } });
  if (product?.stripePriceId && isValidStripePriceId(product.stripePriceId)) {
    return product.stripePriceId;
  }

  // Fallback: settings-based lookup (legacy)
  const settingKey = `STRIPE_PRICE_${productCode}`.toUpperCase();
  const val = await getSetting(settingKey);
  if (val && isValidStripePriceId(val)) return val;

  console.warn("[STRIPE] No valid price_id for product:", productCode);
  return null;
}

/** Legacy compat — still used by old checkout flow */
export async function getPriceIdAsync(productCode: string, plan: string): Promise<string | null> {
  // First try product-level price
  const productPrice = await getPriceIdForProduct(productCode);
  if (productPrice) return productPrice;

  // Fallback: settings key with plan suffix
  const key = `STRIPE_PRICE_${productCode}_${plan}`.toUpperCase();
  const val = await getSetting(key);
  if (val && isValidStripePriceId(val)) return val;

  console.warn("[STRIPE] No valid price_id for:", key);
  return null;
}

/**
 * Resolve productCode from a Stripe price ID by checking Product table.
 */
export async function resolveProductFromPriceId(priceId: string): Promise<{ productCode: string; productName: string } | null> {
  const product = await prisma.product.findFirst({
    where: { stripePriceId: priceId, active: true },
    select: { code: true, name: true },
  });
  if (product) return { productCode: product.code, productName: product.name };
  return null;
}

export async function resolveFromSubscription(sub: Stripe.Subscription): Promise<{ productCode: string; plan: string; priceId: string } | null> {
  const item = sub.items?.data?.[0];
  if (!item?.price?.id) return null;

  const resolved = await resolveProductFromPriceId(item.price.id);
  if (resolved) {
    return { productCode: resolved.productCode, plan: "subscription", priceId: item.price.id };
  }

  return null;
}

/**
 * Get real revenue from Stripe (amounts are in cents).
 */
export async function getRevenueStats(): Promise<{ monthlyRevenue: number; totalRevenue: number }> {
  try {
    const stripe = await getStripe();
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

    // Get recent paid invoices
    const invoices = await stripe.invoices.list({
      status: "paid",
      created: { gte: thirtyDaysAgo },
      limit: 100,
    });

    const monthlyRevenue = invoices.data.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) / 100;

    // Get all-time from active subscriptions MRR
    const subs = await stripe.subscriptions.list({ status: "active", limit: 100 });
    const mrr = subs.data.reduce((sum, sub) => {
      const item = sub.items?.data?.[0];
      if (!item?.price?.unit_amount) return sum;
      const amount = item.price.unit_amount;
      const interval = item.price.recurring?.interval;
      if (interval === "month") return sum + amount;
      if (interval === "year") return sum + Math.round(amount / 12);
      return sum + amount;
    }, 0) / 100;

    return { monthlyRevenue: monthlyRevenue || mrr, totalRevenue: mrr * 12 };
  } catch (err) {
    console.error("[STRIPE] Revenue fetch error:", err);
    return { monthlyRevenue: 0, totalRevenue: 0 };
  }
}
