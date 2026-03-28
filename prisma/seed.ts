import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_PRODUCTS = [
  { name: "Booking System", code: "BOOKING_SYSTEM" },
  { name: "Chatbot AI", code: "CHATBOT_AI" },
];

const DEFAULT_FEATURES = [
  { code: "calendar", name: "Calendar Management", category: "booking", description: "Manage bookings via calendar interface" },
  { code: "sms", name: "SMS Notifications", category: "booking", description: "Send SMS reminders and confirmations" },
  { code: "payments", name: "Payment Processing", category: "booking", description: "Accept and manage payments" },
  { code: "ai_responses", name: "AI Responses", category: "chatbot", description: "AI-powered chat responses" },
  { code: "analytics", name: "Analytics Dashboard", category: "analytics", description: "Usage analytics and reporting" },
  { code: "multi_staff", name: "Multi-Staff Support", category: "booking", description: "Support multiple staff members" },
  { code: "custom_branding", name: "Custom Branding", category: "general", description: "Custom colors, logos, branding" },
  { code: "api_access", name: "API Access", category: "general", description: "REST API access for integrations" },
  { code: "priority_support", name: "Priority Support", category: "general", description: "Priority customer support" },
];

const PLAN_FEATURE_MAP: Record<string, Record<string, string[]>> = {
  BOOKING_SYSTEM: {
    basic: ["calendar", "payments"],
    pro: ["calendar", "sms", "payments", "analytics", "multi_staff", "custom_branding", "api_access", "priority_support"],
  },
  CHATBOT_AI: {
    basic: ["ai_responses"],
    pro: ["ai_responses", "analytics", "custom_branding", "api_access", "priority_support"],
  },
};

async function main() {
  console.log("🌱 Starting seed...");

  // Seed admin
  const existingAdmin = await prisma.user.findUnique({ where: { email: "admin@visli.io" } });
  if (existingAdmin) {
    console.log("✅ Admin user already exists, skipping.");
  } else {
    const hashedPassword = await bcrypt.hash("admin123", 12);
    const admin = await prisma.user.create({ data: { email: "admin@visli.io", password: hashedPassword } });
    console.log(`✅ Admin created: ${admin.email} (id: ${admin.id})`);
  }

  // Seed products
  for (const product of DEFAULT_PRODUCTS) {
    const existing = await prisma.product.findUnique({ where: { code: product.code } });
    if (existing) {
      console.log(`✅ Product "${product.code}" already exists, skipping.`);
    } else {
      await prisma.product.create({ data: product });
      console.log(`✅ Product created: ${product.name} (${product.code})`);
    }
  }

  // Seed features
  for (const feat of DEFAULT_FEATURES) {
    const existing = await prisma.feature.findUnique({ where: { code: feat.code } });
    if (existing) {
      console.log(`✅ Feature "${feat.code}" already exists, skipping.`);
    } else {
      await prisma.feature.create({ data: feat });
      console.log(`✅ Feature created: ${feat.name} (${feat.code})`);
    }
  }

  // Seed plan-feature mappings
  for (const [productCode, plans] of Object.entries(PLAN_FEATURE_MAP)) {
    for (const [plan, featureCodes] of Object.entries(plans)) {
      for (const featureCode of featureCodes) {
        const feature = await prisma.feature.findUnique({ where: { code: featureCode } });
        if (!feature) continue;

        const existing = await prisma.planFeature.findFirst({
          where: { plan, featureId: feature.id, product: productCode },
        });
        if (!existing) {
          await prisma.planFeature.create({
            data: { plan, featureId: feature.id, product: productCode },
          });
          console.log(`  ✅ ${productCode} ${plan} → ${featureCode}`);
        }
      }
    }
  }

  console.log("🌱 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
