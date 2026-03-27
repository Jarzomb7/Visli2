import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  console.log("[CHECK-LICENSE] ===== License check =====");

  try {
    let body: { license_key?: string; domain?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { status: "invalid", message: "Invalid request body" },
        { status: 400 }
      );
    }

    const { license_key, domain } = body;

    if (!license_key || !domain) {
      return NextResponse.json({
        status: "invalid",
        message: "license_key and domain are required",
      });
    }

    console.log("[CHECK-LICENSE] Key:", license_key, "Domain:", domain);

    const license = await prisma.license.findUnique({
      where: { key: license_key },
    });

    if (!license) {
      console.log("[CHECK-LICENSE] License not found");
      return NextResponse.json({
        status: "invalid",
        message: "License not found",
      });
    }

    const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (license.domain.toLowerCase() !== cleanDomain) {
      console.log("[CHECK-LICENSE] Domain mismatch:", license.domain, "vs", cleanDomain);
      return NextResponse.json({
        status: "invalid",
        message: "Domain mismatch",
      });
    }

    if (license.status === "suspended") {
      return NextResponse.json({
        status: "invalid",
        message: "License suspended",
      });
    }

    if (license.status === "expired" || new Date() > license.expiresAt) {
      if (license.status !== "expired") {
        await prisma.license.update({
          where: { id: license.id },
          data: { status: "expired" },
        });
      }
      console.log("[CHECK-LICENSE] License expired");
      return NextResponse.json({
        status: "expired",
        message: "License expired",
        plan: license.plan,
      });
    }

    console.log("[CHECK-LICENSE] ✅ License valid");
    return NextResponse.json({
      status: "active",
      plan: license.plan,
      expires_at: license.expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("[CHECK-LICENSE] ❌ Error:", err);
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 }
    );
  }
}
