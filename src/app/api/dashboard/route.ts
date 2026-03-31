import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { getRevenueStats } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [totalLicenses, activeLicenses, expiredLicenses, recentLicenses, totalValidations, totalSubscriptions, activeSubscriptions, totalClients, revenue, manualRevenueRows] =
      await Promise.all([
        prisma.license.count(),
        prisma.license.count({ where: { status: "active" } }),
        prisma.license.count({ where: { status: "expired" } }),
        prisma.license.findMany({
          include: { product: { select: { id: true, name: true, code: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.validationLog.count(),
        prisma.subscription.count(),
        prisma.subscription.count({ where: { status: "active" } }),
        prisma.user.count({ where: { role: "client" } }),
        getRevenueStats(),
        prisma.manualRevenue.findMany(),
      ]);

    const manualTotal = manualRevenueRows.reduce((sum, item) => sum + item.amount, 0);

    return NextResponse.json({
      totalLicenses,
      activeLicenses,
      expiredLicenses,
      recentLicenses,
      totalValidations,
      totalSubscriptions,
      activeSubscriptions,
      totalClients,
      monthlyRevenue: revenue.monthlyRevenue + manualTotal,
      previousMonthRevenue: revenue.previousMonthRevenue,
      annualRevenue: revenue.totalRevenue + manualTotal,
      renewalsRevenue: revenue.renewalsRevenue,
      newSubscriptionsRevenue: revenue.newSubscriptionsRevenue,
      manualRevenue: manualTotal,
    });
  } catch (err) {
    console.error("[DASHBOARD] Error:", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
