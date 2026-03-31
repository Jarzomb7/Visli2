import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { generateLicenseKey, getExpirationDate } from "@/lib/license";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const searchFilter = search
      ? {
          OR: [
            { key: { contains: search, mode: "insensitive" as const } },
            { domain: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};
    const statusFilter = status && status !== "all" ? { status } : {};
    const where = { ...searchFilter, ...statusFilter };

    const [licenses, total] = await Promise.all([
      prisma.license.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, code: true } },
          subscription: { select: { id: true, stripeSubscriptionId: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.license.count({ where }),
    ]);

    return NextResponse.json({
      licenses,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[LICENSES GET] Error:", err);
    return NextResponse.json({ error: "Failed to fetch licenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { domain?: string; plan?: string; duration?: string; productId?: number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { domain, plan, duration, productId } = body;

    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").replace(/:\d+$/, "").replace(/\/$/, "");
    const validDuration = ["1m", "3m", "6m", "12m"].includes(duration || "") ? duration! : "1m";

    // Validate productId if provided
    if (productId) {
      const productExists = await prisma.product.findUnique({ where: { id: productId } });
      if (!productExists) {
        return NextResponse.json({ error: "Invalid product" }, { status: 400 });
      }
    }

    const license = await prisma.license.create({
      data: {
        key: generateLicenseKey(),
        domain: cleanDomain,
        plan: validDuration,
        features: [],
        status: "active",
        domainLocked: true,
        expiresAt: getExpirationDate(validDuration),
        productId: productId || null,
      },
      include: { product: true },
    });

    console.log("[LICENSES] ✅ Created license:", license.key, "for", license.domain);

    return NextResponse.json({ success: true, license });
  } catch (err) {
    console.error("[LICENSES POST] Error:", err);
    return NextResponse.json({ error: "Failed to create license" }, { status: 500 });
  }
}
