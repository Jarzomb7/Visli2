import { prisma } from "./prisma";
import { generateLicenseKey } from "./license";

export async function findOrCreateLicense(params: {
  subscriptionId?: string | null;
  email: string;
  productId: number;
  plan: string;
  expiresAt: Date;
  domain: string;
}): Promise<{ id: number; key: string }> {
  const existing = params.subscriptionId
    ? await prisma.license.findFirst({
        where: { stripeSubId: params.subscriptionId },
        orderBy: { createdAt: "desc" },
        select: { id: true, key: true },
      })
    : null;

  if (existing) return existing;

  return prisma.license.create({
    data: {
      key: generateLicenseKey(),
      domain: params.domain,
      status: "active",
      plan: params.plan,
      features: [],
      email: params.email,
      domainLocked: params.domain !== "PENDING",
      stripeSubId: params.subscriptionId || null,
      expiresAt: params.expiresAt,
      productId: params.productId,
    },
    select: { id: true, key: true },
  });
}

export async function syncLicenseFromSubscription(params: {
  subscriptionId: string;
  plan: string;
  expiresAt: Date;
  status: "active" | "suspended" | "expired";
}): Promise<void> {
  await prisma.license.updateMany({
    where: { stripeSubId: params.subscriptionId },
    data: {
      plan: params.plan,
      expiresAt: params.expiresAt,
      status: params.status,
      features: [],
    },
  });
}
