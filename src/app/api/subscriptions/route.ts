import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

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
            { email: { contains: search, mode: "insensitive" as const } },
            { productCode: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};
    const statusFilter = status && status !== "all" ? { status } : {};
    const where = { ...searchFilter, ...statusFilter };

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          license: { select: { id: true, key: true, domain: true, status: true } },
          product: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, email: true, name: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.subscription.count({ where }),
    ]);

    return NextResponse.json({
      subscriptions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[SUBSCRIPTIONS] Error:", err);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}
