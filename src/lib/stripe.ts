import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
  typescript: true,
});

export const PLAN_FEATURES: Record<string, string[]> = {
  basic: ["calendar", "payments"],
  pro: ["calendar", "sms", "payments", "ai_responses", "analytics", "multi_staff", "custom_branding", "api_access", "priority_support"],
};

export function getFeaturesForPlan(plan: string): string[] {
  return PLAN_FEATURES[plan.toLowerCase()] || PLAN_FEATURES.basic;
}

export function getPriceId(productCode: string, plan: string): string | null {
  const key = `STRIPE_PRICE_${productCode}_${plan}`.toUpperCase();
  return process.env[key] || null;
}

const PRICE_ENV_MAP = [
  ["STRIPE_PRICE_BOOKING_BASIC", "BOOKING_SYSTEM", "basic"],
  ["STRIPE_PRICE_BOOKING_PRO", "BOOKING_SYSTEM", "pro"],
  ["STRIPE_PRICE_CHATBOT_BASIC", "CHATBOT_AI", "basic"],
  ["STRIPE_PRICE_CHATBOT_PRO", "CHATBOT_AI", "pro"],
] as const;

export function parsePriceMetadata(priceId: string): { productCode: string; plan: string } | null {
  const map: Record<string, { productCode: string; plan: string }> = {};
  for (const [envKey, productCode, plan] of PRICE_ENV_MAP) {
    const id = process.env[envKey];
    if (id) map[id] = { productCode, plan };
  }
  return map[priceId] || null;
}

/**
 * Resolve productCode + plan from a Stripe subscription object.
 * Checks items[0].price against env-configured price IDs.
 */
export function resolveFromSubscription(sub: Stripe.Subscription): { productCode: string; plan: string; priceId: string } | null {
  const item = sub.items?.data?.[0];
  if (!item?.price?.id) return null;
  const parsed = parsePriceMetadata(item.price.id);
  if (!parsed) return null;
  return { ...parsed, priceId: item.price.id };
}
