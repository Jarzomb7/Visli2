import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
  typescript: true,
});

export const PLAN_FEATURES: Record<string, string[]> = {
  basic: ["booking"],
  pro: ["booking", "chatbot", "analytics"],
};

export function getFeaturesForPlan(plan: string): string[] {
  return PLAN_FEATURES[plan.toLowerCase()] || PLAN_FEATURES.basic;
}

export function getPriceId(productCode: string, plan: string): string | null {
  const key = `STRIPE_PRICE_${productCode}_${plan}`.toUpperCase();
  return process.env[key] || null;
}

export function parsePriceMetadata(priceId: string): { productCode: string; plan: string } | null {
  const map: Record<string, { productCode: string; plan: string }> = {};

  const pairs = [
    ["STRIPE_PRICE_BOOKING_BASIC", "BOOKING_SYSTEM", "basic"],
    ["STRIPE_PRICE_BOOKING_PRO", "BOOKING_SYSTEM", "pro"],
    ["STRIPE_PRICE_CHATBOT_BASIC", "CHATBOT_AI", "basic"],
    ["STRIPE_PRICE_CHATBOT_PRO", "CHATBOT_AI", "pro"],
  ] as const;

  for (const [envKey, productCode, plan] of pairs) {
    const id = process.env[envKey];
    if (id) map[id] = { productCode, plan };
  }

  return map[priceId] || null;
}
