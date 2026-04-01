import { prisma } from "./prisma";

export type ProductCode = string;

export interface ProductDescriptor {
  code: ProductCode;
  name: string;
  active: boolean;
  paymentType: string;
  stripePriceId: string | null;
}

const DEFAULT_PRODUCT_NAMES: Record<string, string> = {
  BOOKING_SYSTEM: "Booking System",
  CHATBOT_AI: "Chatbot AI",
  AI_AGENT: "AI Agent",
};

export async function ensureProductExists(code: string): Promise<{ id: number; code: string; name: string }> {
  const normalized = code.toUpperCase();
  return prisma.product.upsert({
    where: { code: normalized },
    update: {},
    create: {
      code: normalized,
      name: DEFAULT_PRODUCT_NAMES[normalized] || normalized,
      active: true,
      paymentType: "subscription",
    },
    select: { id: true, code: true, name: true },
  });
}

export async function getActiveProducts(): Promise<ProductDescriptor[]> {
  const rows = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    select: { code: true, name: true, active: true, paymentType: true, stripePriceId: true },
  });

  return rows.map((p) => ({
    code: p.code,
    name: p.name,
    active: p.active,
    paymentType: p.paymentType,
    stripePriceId: p.stripePriceId,
  }));
}
