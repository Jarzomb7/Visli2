export type BillingPlanId = "starter" | "basic" | "pro" | "premium";

export interface BillingPlan {
  id: BillingPlanId;
  name: string;
  priceMonthly: number;
  features: string[];
  maxLicenses: number;
  settingKey: string;
  productCode: string;
}

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 19,
    features: ["Core features", "Email support", "1 workspace"],
    maxLicenses: 1,
    settingKey: "STRIPE_PRICE_STARTER",
    productCode: "STARTER",
  },
  {
    id: "basic",
    name: "Basic",
    priceMonthly: 49,
    features: ["Everything in Starter", "Priority support", "Automations"],
    maxLicenses: 3,
    settingKey: "STRIPE_PRICE_BASIC",
    productCode: "BASIC",
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 99,
    features: ["Everything in Basic", "Advanced analytics", "API access"],
    maxLicenses: 10,
    settingKey: "STRIPE_PRICE_PRO",
    productCode: "PRO",
  },
  {
    id: "premium",
    name: "Premium",
    priceMonthly: 199,
    features: ["Everything in Pro", "Dedicated manager", "SLA + onboarding"],
    maxLicenses: 50,
    settingKey: "STRIPE_PRICE_PREMIUM",
    productCode: "PREMIUM",
  },
];

export function getBillingPlan(planId: string): BillingPlan | null {
  return BILLING_PLANS.find((p) => p.id === planId.toLowerCase()) || null;
}
