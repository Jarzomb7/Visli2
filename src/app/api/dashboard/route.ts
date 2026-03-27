import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [totalLicenses, activeLicenses, expiredLicenses, recentLicenses] =
      await Promise.all([
        prisma.license.count(),
        prisma.license.count({ where: { status: "active" } }),
        prisma.license.count({ where: { status: "expired" } }),
        prisma.license.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

    return NextResponse.json({
      totalLicenses,
      activeLicenses,
      expiredLicenses,
      recentLicenses,
    });
  } catch (err) {
    console.error("[DASHBOARD] Error:", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
