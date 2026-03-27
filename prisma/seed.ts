import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@visli.io" },
  });

  if (existingAdmin) {
    console.log("✅ Admin user already exists, skipping seed.");
    return;
  }

  const hashedPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.create({
    data: {
      email: "admin@visli.io",
      password: hashedPassword,
    },
  });

  console.log(`✅ Admin user created: ${admin.email} (id: ${admin.id})`);
  console.log("📧 Email: admin@visli.io");
  console.log("🔑 Password: admin123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
