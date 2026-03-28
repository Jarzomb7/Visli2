import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_PRODUCTS = [
  { name: "Booking System", code: "BOOKING_SYSTEM" },
  { name: "Chatbot AI", code: "CHATBOT_AI" },
];

async function main() {
  console.log("🌱 Starting seed...");

  // Seed admin user
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@visli.io" },
  });

  if (existingAdmin) {
    console.log("✅ Admin user already exists, skipping.");
  } else {
    const hashedPassword = await bcrypt.hash("admin123", 12);
    const admin = await prisma.user.create({
      data: { email: "admin@visli.io", password: hashedPassword },
    });
    console.log(`✅ Admin created: ${admin.email} (id: ${admin.id})`);
  }

  // Seed default products
  for (const product of DEFAULT_PRODUCTS) {
    const existing = await prisma.product.findUnique({ where: { code: product.code } });
    if (existing) {
      console.log(`✅ Product "${product.code}" already exists, skipping.`);
    } else {
      await prisma.product.create({ data: product });
      console.log(`✅ Product created: ${product.name} (${product.code})`);
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
