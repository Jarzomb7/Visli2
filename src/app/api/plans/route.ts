import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await prisma.plan.findMany({ orderBy: { priceMonthly: "asc" } });
  return NextResponse.json({ plans });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, description, priceMonthly, stripePriceId, features, isActive } = body as {
    name?: string;
    description?: string;
    priceMonthly?: number;
    stripePriceId?: string;
    features?: string[];
    isActive?: boolean;
  };

  if (!name || !stripePriceId || typeof priceMonthly !== "number") {
    return NextResponse.json({ error: "name, priceMonthly, stripePriceId are required" }, { status: 400 });
  }

  const plan = await prisma.plan.create({
    data: {
      name,
      description: description || null,
      priceMonthly,
      stripePriceId,
      features: Array.isArray(features) ? features : [],
      isActive: isActive ?? true,
    },
  });

  return NextResponse.json({ plan });
}

export async function PUT(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, name, description, priceMonthly, stripePriceId, features, isActive } = body as {
    id?: number;
    name?: string;
    description?: string;
    priceMonthly?: number;
    stripePriceId?: string;
    features?: string[];
    isActive?: boolean;
  };
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const plan = await prisma.plan.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(priceMonthly !== undefined ? { priceMonthly } : {}),
      ...(stripePriceId !== undefined ? { stripePriceId } : {}),
      ...(features !== undefined ? { features } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  return NextResponse.json({ plan });
}

export async function DELETE(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const id = (body as { id?: number }).id;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await prisma.plan.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
