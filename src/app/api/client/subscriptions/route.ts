import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [subscriptions, plans] = await Promise.all([
    prisma.subscription.findMany({
      where: { OR: [{ email: session.email }, { userId: session.id }] },
      include: { license: true, product: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: "asc" },
    }),
  ]);

  return NextResponse.json({ subscriptions, plans });
}

export async function PATCH(request: NextRequest) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { subscriptionId: number; planId: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.subscriptionId || !body.planId) {
    return NextResponse.json({ error: "subscriptionId and planId are required" }, { status: 400 });
  }

  const [subscription, plan] = await Promise.all([
    prisma.subscription.findUnique({ where: { id: body.subscriptionId } }),
    prisma.plan.findUnique({ where: { id: body.planId } }),
  ]);

  if (!subscription || (subscription.email !== session.email && subscription.userId !== session.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!plan || !plan.isActive || !plan.stripePriceId) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      plan: plan.name.toLowerCase(),
      stripePriceId: plan.stripePriceId,
      productCode: plan.name.toUpperCase().replace(/\s+/g, "_"),
    },
  });

  return NextResponse.json({ success: true });
}
