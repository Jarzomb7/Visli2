import { prisma } from "./prisma";

export type PlanLimits = Record<string, number>;

export interface PlanProductMapping {
  planId: number;
  planName: string;
  priceMonthly: number;
  stripePriceId: string;
  products: string[];
  limits: PlanLimits;
  productLimits: Record<string, PlanLimits>;
  isActive: boolean;
}

interface PlanFeaturesShape {
  products?: unknown;
  limits?: unknown;
  productLimits?: unknown;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string").map((v) => v.toUpperCase());
}

function toLimits(value: unknown): PlanLimits {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
    .map(([k, v]) => [k, Number(v)] as const);

  return Object.fromEntries(entries);
}

function parsePlanFeatures(features: unknown): { products: string[]; limits: PlanLimits; productLimits: Record<string, PlanLimits> } {
  const parsed = (features || {}) as PlanFeaturesShape;
  const products = toStringArray(parsed.products);
  const limits = toLimits(parsed.limits);

  const productLimits: Record<string, PlanLimits> = {};
  if (parsed.productLimits && typeof parsed.productLimits === "object" && !Array.isArray(parsed.productLimits)) {
    for (const [productCode, value] of Object.entries(parsed.productLimits as Record<string, unknown>)) {
      productLimits[productCode.toUpperCase()] = toLimits(value);
    }
  }

  return { products, limits, productLimits };
}

export function getMergedLimits(mapping: PlanProductMapping, productCode?: string | null): PlanLimits {
  if (!productCode) return { ...mapping.limits };
  const productSpecific = mapping.productLimits[productCode.toUpperCase()] || {};
  return { ...mapping.limits, ...productSpecific };
}

export async function getPlanProductMappings(onlyActive = true): Promise<PlanProductMapping[]> {
  const plans = await prisma.plan.findMany({
    where: onlyActive ? { isActive: true } : undefined,
    orderBy: { priceMonthly: "asc" },
    select: {
      id: true,
      name: true,
      priceMonthly: true,
      stripePriceId: true,
      features: true,
      isActive: true,
    },
  });

  return plans.map((plan) => {
    const { products, limits, productLimits } = parsePlanFeatures(plan.features);
    return {
      planId: plan.id,
      planName: plan.name,
      priceMonthly: plan.priceMonthly,
      stripePriceId: plan.stripePriceId,
      products,
      limits,
      productLimits,
      isActive: plan.isActive,
    };
  });
}

export async function resolvePlanByPriceId(priceId: string): Promise<PlanProductMapping | null> {
  const plan = await prisma.plan.findFirst({
    where: { stripePriceId: priceId },
    select: { id: true, name: true, priceMonthly: true, stripePriceId: true, features: true, isActive: true },
  });
  if (!plan) return null;

  const { products, limits, productLimits } = parsePlanFeatures(plan.features);
  return {
    planId: plan.id,
    planName: plan.name,
    priceMonthly: plan.priceMonthly,
    stripePriceId: plan.stripePriceId,
    products,
    limits,
    productLimits,
    isActive: plan.isActive,
  };
}

export function supportsProduct(mapping: PlanProductMapping, productCode: string): boolean {
  if (mapping.products.length === 0) return true;
  return mapping.products.includes(productCode.toUpperCase());
}
