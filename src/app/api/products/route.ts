import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { licenses: true, subscriptions: true } } },
    });

    return NextResponse.json({ products });
  } catch (err) {
    console.error("[PRODUCTS] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, code, description, stripePriceId, paymentType, priceCents } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
    }

    if (stripePriceId && !stripePriceId.startsWith("price_")) {
      return NextResponse.json({ error: "Stripe Price ID must start with price_" }, { status: 400 });
    }

    const existing = await prisma.product.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      return NextResponse.json({ error: "Product with this code already exists" }, { status: 409 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        code: code.toUpperCase(),
        description: description || null,
        stripePriceId: stripePriceId || null,
        paymentType: paymentType || "subscription",
        priceCents: priceCents ? parseInt(priceCents) : null,
      },
    });

    console.log("[PRODUCTS] ✅ Created:", product.code);
    return NextResponse.json({ product });
  } catch (err) {
    console.error("[PRODUCTS] Create error:", err);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, name, description, stripePriceId, paymentType, priceCents, active } = body;

    if (!id) return NextResponse.json({ error: "Product ID required" }, { status: 400 });

    if (stripePriceId && !stripePriceId.startsWith("price_")) {
      return NextResponse.json({ error: "Stripe Price ID must start with price_" }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(stripePriceId !== undefined ? { stripePriceId: stripePriceId || null } : {}),
        ...(paymentType !== undefined ? { paymentType } : {}),
        ...(priceCents !== undefined ? { priceCents: priceCents ? parseInt(priceCents) : null } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });

    console.log("[PRODUCTS] ✅ Updated:", product.code);
    return NextResponse.json({ product });
  } catch (err) {
    console.error("[PRODUCTS] Update error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
