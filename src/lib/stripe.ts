import Stripe from "stripe";
import { getSetting } from "./settings";

// Lazy-initialized Stripe instance — always uses DB settings
let _stripe: Stripe | null = null;

export async function getStripe(): Promise<Stripe> {
  if (_stripe) return _stripe;
  const key = await getSetting("STRIPE_SECRET_KEY", process.env.STRIPE_SECRET_KEY || "");
  _stripe = new Stripe(key, { 
  typescript: true 
});
  return _stripe;
}

/** Get webhook secret from DB settings, falling back to env */
export async function getWebhookSecret(): Promise<string> {
  return getSetting("STRIPE_WEBHOOK_SECRET", process.env.STRIPE_WEBHOOK_SECRET || "");
}

export function resetStripeClient(): void {
  _stripe = null;
}

export const PLAN_FEATURES: Record<string, string[]> = {
  basic: ["calendar", "payments"],
  pro: ["calendar", "sms", "payments", "ai_responses", "analytics", "multi_staff", "custom_branding", "api_access", "priority_support"],
};

export function getFeaturesForPlan(plan: string): string[] {
  return PLAN_FEATURES[plan.toLowerCase()] || PLAN_FEATURES.basic;
}

/**
 * Validate that a string looks like a real Stripe price ID.
 * Real Stripe price IDs always start with "price_".
 * This prevents placeholder values like "TU_WKLEJ_PRICE_ID" from reaching Stripe.
 */
export function isValidStripePriceId(val: string): boolean {
  return typeof val === "string" && val.startsWith("price_") && val.length > 10;
}

/** Async — checks DB settings first, then env. Validates format before returning. */
export async function getPriceIdAsync(productCode: string, plan: string): Promise<string | null> {
  const key = `STRIPE_PRICE_${productCode}_${plan}`.toUpperCase();
  const val = await getSetting(key);

  if (!val) {
    console.warn("[STRIPE] No price ID configured for:", key);
    return null;
  }

  if (!isValidStripePriceId(val)) {
    console.error(`[STRIPE] ❌ Invalid price ID for ${key}: "${val}" — must start with "price_". Check Settings → Stripe.`);
    return null;
  }

  return val;
}

const PRICE_ENV_MAP = [
  ["STRIPE_PRICE_BOOKING_BASIC", "BOOKING_SYSTEM", "basic"],
  ["STRIPE_PRICE_BOOKING_PRO", "BOOKING_SYSTEM", "pro"],
  ["STRIPE_PRICE_CHATBOT_BASIC", "CHATBOT_AI", "basic"],
  ["STRIPE_PRICE_CHATBOT_PRO", "CHATBOT_AI", "pro"],
] as const;

export async function parsePriceMetadata(priceId: string): Promise<{ productCode: string; plan: string } | null> {
  const map: Record<string, { productCode: string; plan: string }> = {};
  for (const [envKey, productCode, plan] of PRICE_ENV_MAP) {
    const id = await getSetting(envKey);
    if (id) map[id] = { productCode, plan };
  }
  return map[priceId] || null;
}

/**
 * Resolve productCode + plan from a Stripe subscription object.
 * Checks items[0].price against DB-configured price IDs.
 */
export async function resolveFromSubscription(sub: Stripe.Subscription): Promise<{ productCode: string; plan: string; priceId: string } | null> {
  const item = sub.items?.data?.[0];
  if (!item?.price?.id) return null;
  const parsed = await parsePriceMetadata(item.price.id);
  if (!parsed) return null;
  return { ...parsed, priceId: item.price.id };
}
