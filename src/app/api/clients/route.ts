import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const search = searchParams.get("search") || "";

    const baseWhere = search
      ? {
          AND: [
            { role: "client" as const },
            {
              OR: [
                { email: { contains: search, mode: "insensitive" as const } },
                { name: { contains: search, mode: "insensitive" as const } },
              ],
            },
          ],
        }
      : { role: "client" as const };

    const [clients, total] = await Promise.all([
      prisma.user.findMany({
        where: baseWhere,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          stripeCustomerId: true,
          createdAt: true,
          _count: { select: { subscriptions: true, addons: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where: baseWhere }),
    ]);

    // Also get license count per client email
    const emails = clients.map((c) => c.email);
    const licenseCounts = await prisma.license.groupBy({
      by: ["email"],
      where: { email: { in: emails } },
      _count: { id: true },
    });
    const licenseMap = Object.fromEntries(
      licenseCounts.map((lc) => [lc.email, lc._count.id])
    );

    const enriched = clients.map((c) => ({
      ...c,
      licenseCount: licenseMap[c.email] || 0,
    }));

    return NextResponse.json({
      clients: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[CLIENTS API] Error:", err);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}
