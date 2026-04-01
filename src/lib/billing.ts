import { prisma } from "./prisma";

export async function upsertSubscriptionRecord(params: {
  stripeSubscriptionId: string;
  email: string;
  userId: number;
  stripeCustomerId: string;
  stripePriceId: string | null;
  plan: string;
  productCode: string;
  productId: number;
  currentPeriodEnd: Date;
  licenseId: number;
  status?: string;
}): Promise<void> {
  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: params.stripeSubscriptionId },
    update: {
      email: params.email,
      userId: params.userId,
      stripeCustomerId: params.stripeCustomerId,
      stripePriceId: params.stripePriceId,
      status: params.status || "active",
      plan: params.plan,
      productCode: params.productCode,
      productId: params.productId,
      currentPeriodEnd: params.currentPeriodEnd,
      licenseId: params.licenseId,
    },
    create: {
      email: params.email,
      userId: params.userId,
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      stripePriceId: params.stripePriceId,
      status: params.status || "active",
      plan: params.plan,
      productCode: params.productCode,
      productId: params.productId,
      currentPeriodEnd: params.currentPeriodEnd,
      licenseId: params.licenseId,
    },
  });
}

export async function updateSubscriptionStatus(params: {
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd?: Date;
  cancelAt?: Date | null;
  plan?: string;
  stripePriceId?: string | null;
  productCode?: string;
}): Promise<void> {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: params.stripeSubscriptionId },
    data: {
      status: params.status,
      ...(params.currentPeriodEnd ? { currentPeriodEnd: params.currentPeriodEnd } : {}),
      ...(params.cancelAt !== undefined ? { cancelAt: params.cancelAt } : {}),
      ...(params.plan ? { plan: params.plan } : {}),
      ...(params.stripePriceId !== undefined ? { stripePriceId: params.stripePriceId } : {}),
      ...(params.productCode ? { productCode: params.productCode } : {}),
    },
  });
}
