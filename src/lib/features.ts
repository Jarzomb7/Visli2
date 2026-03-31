import { prisma } from "./prisma";

/**
 * Get features for a specific license by resolving through plan-feature mappings.
 * Falls back to the license's stored features array if no DB mappings exist.
 */
export async function getFeaturesForLicense(licenseId: number): Promise<string[]> {
  try {
    const license = await prisma.license.findUnique({
      where: { id: licenseId },
      include: { product: true },
    });

    if (!license) return [];

    // Try DB-driven features first
    const dbFeatures = await getFeaturesForPlanAndProduct(
      license.plan,
      license.product?.code || null
    );

    if (dbFeatures.length > 0) return dbFeatures;

    // Fallback to stored features array on license
    if (license.features.length > 0) return license.features;

    // Final fallback to static config
    return getStaticFeaturesForPlan(license.plan);
  } catch (err) {
    console.error("[FEATURES] Error resolving features for license:", licenseId, err);
    return [];
  }
}

/**
 * Get feature codes for a plan + product combination from the database.
 */
export async function getFeaturesForPlanAndProduct(
  plan: string,
  productCode: string | null
): Promise<string[]> {
  try {
    const planFeatures = await prisma.planFeature.findMany({
      where: { plan: plan.toLowerCase(), ...(productCode ? { product: productCode } : {}) },
      include: { feature: { select: { code: true } } },
    });

    // Also include global (product=null) features for this plan
    if (productCode) {
      const globalFeatures = await prisma.planFeature.findMany({
        where: { plan: plan.toLowerCase(), product: null },
        include: { feature: { select: { code: true } } },
      });
      const allCodes = new Set([
        ...planFeatures.map((pf) => pf.feature.code),
        ...globalFeatures.map((pf) => pf.feature.code),
      ]);
      return Array.from(allCodes);
    }

    return planFeatures.map((pf) => pf.feature.code);
  } catch (err) {
    console.error("[FEATURES] Error fetching plan features:", err);
    return [];
  }
}

/**
 * Get all features with their plan assignments grouped by product.
 */
export async function getFeatureMatrix(): Promise<{
  features: { id: number; code: string; name: string; description: string | null; category: string | null }[];
  planFeatures: { plan: string; product: string | null; featureCode: string }[];
}> {
  try {
    const [features, planFeatures] = await Promise.all([
      prisma.feature.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
      prisma.planFeature.findMany({
        include: { feature: { select: { code: true } } },
        orderBy: [{ plan: "asc" }],
      }),
    ]);

    return {
      features,
      planFeatures: planFeatures.map((pf) => ({
        plan: pf.plan,
        product: pf.product,
        featureCode: pf.feature.code,
      })),
    };
  } catch (err) {
    console.error("[FEATURES] Error fetching feature matrix:", err);
    return { features: [], planFeatures: [] };
  }
}

/**
 * Static fallback features (used when DB has no PlanFeature rows).
 */
function getStaticFeaturesForPlan(plan: string): string[] {
  const STATIC: Record<string, string[]> = {
    basic: ["calendar", "payments"],
    pro: ["calendar", "sms", "payments", "ai_responses", "analytics", "multi_staff", "custom_branding", "api_access", "priority_support"],
  };
  return STATIC[plan.toLowerCase()] || STATIC.basic;
}

/**
 * Auto-seed features if none exist (called from login flow).
 */
export async function ensureFeaturesExist(): Promise<void> {
  try {
    const count = await prisma.feature.count();
    if (count === 0) {
      console.log("[SEED] No features found, creating defaults...");
      await prisma.feature.createMany({
        data: [
          { code: "calendar", name: "Calendar Management", category: "booking" },
          { code: "sms", name: "SMS Notifications", category: "booking" },
          { code: "payments", name: "Payment Processing", category: "booking" },
          { code: "ai_responses", name: "AI Responses", category: "chatbot" },
          { code: "analytics", name: "Analytics Dashboard", category: "analytics" },
          { code: "multi_staff", name: "Multi-Staff Support", category: "booking" },
          { code: "custom_branding", name: "Custom Branding", category: "general" },
          { code: "api_access", name: "API Access", category: "general" },
          { code: "priority_support", name: "Priority Support", category: "general" },
        ],
        skipDuplicates: true,
      });
      console.log("[SEED] ✅ Default features created");

      // Seed basic plan-feature mappings
      const features = await prisma.feature.findMany();
      const featureMap = Object.fromEntries(features.map((f) => [f.code, f.id]));

      const basicBooking = ["calendar", "payments"];
      const proBooking = ["calendar", "sms", "payments", "analytics", "multi_staff", "custom_branding", "api_access", "priority_support"];
      const basicChatbot = ["ai_responses"];
      const proChatbot = ["ai_responses", "analytics", "custom_branding", "api_access", "priority_support"];

      const mappings: { plan: string; product: string; featureId: number }[] = [];
      for (const code of basicBooking) if (featureMap[code]) mappings.push({ plan: "basic", product: "BOOKING_SYSTEM", featureId: featureMap[code] });
      for (const code of proBooking) if (featureMap[code]) mappings.push({ plan: "pro", product: "BOOKING_SYSTEM", featureId: featureMap[code] });
      for (const code of basicChatbot) if (featureMap[code]) mappings.push({ plan: "basic", product: "CHATBOT_AI", featureId: featureMap[code] });
      for (const code of proChatbot) if (featureMap[code]) mappings.push({ plan: "pro", product: "CHATBOT_AI", featureId: featureMap[code] });

      await prisma.planFeature.createMany({ data: mappings, skipDuplicates: true });
      console.log("[SEED] ✅ Default plan-feature mappings created");
    }
  } catch (err) {
    console.error("[SEED] Auto-seed features error (non-fatal):", err);
  }
}
