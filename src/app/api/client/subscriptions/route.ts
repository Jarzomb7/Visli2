import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getClientSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriptions = await prisma.subscription.findMany({
    where: {
      OR: [
        { email: session.email },
        { userId: session.id }
      ]
    },
    include: {
      license: true,
      product: true
    },
    orderBy: { createdAt: "desc" }
  });

  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { priceMonthly: "asc" }
  });

  return NextResponse.json({ subscriptions, plans });
}

export async function PATCH(request: NextRequest) {
  const session = await getClientSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { subscriptionId: number; planId: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.subscriptionId || !body.planId) {
    return NextResponse.json({ error: "subscriptionId and planId are required" }, { status: 400 });
  }

  const sub = await prisma.subscription.findUnique({ where: { id: body.subscriptionId } });
  if (!sub || (sub.email !== session.email && sub.userId !== session.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nextPlan = await prisma.plan.findUnique({ where: { id: body.planId } });
  const priceId = nextPlan?.stripePriceId;

  if (!priceId) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      plan: nextPlan?.name.toLowerCase() || sub.plan,
      stripePriceId: priceId,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getClientSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { subscriptionId: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.subscriptionId) {
    return NextResponse.json({ error: "subscriptionId required" }, { status: 400 });
  }

  const sub = await prisma.subscription.findUnique({ where: { id: body.subscriptionId } });
  if (!sub || (sub.email !== session.email && sub.userId !== session.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "canceled", cancelAt: sub.currentPeriodEnd },
  });

  return NextResponse.json({ success: true });
}
