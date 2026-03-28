import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function cleanDomain(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

async function logValidation(data: {
  licenseKey: string;
  domain: string;
  product: string | null;
  result: string;
  reason: string | null;
  ip: string | null;
}) {
  try {
    await prisma.validationLog.create({
      data: {
        licenseKey: data.licenseKey,
        domain: data.domain,
        product: data.product,
        result: data.result,
        reason: data.reason,
        ip: data.ip,
      },
    });
  } catch (err) {
    console.error("[VALIDATE-LOG] Failed to write log:", err);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

  console.log("[VALIDATE] ===== License validation request =====");
  console.log("[VALIDATE] IP:", ip);

  try {
    let body: { key?: string; domain?: string; product?: string };
    try {
      body = await request.json();
    } catch {
      console.log("[VALIDATE] ❌ Invalid request body");
      return NextResponse.json(
        { valid: false, reason: "Invalid request body" },
        { status: 400 }
      );
    }

    const { key, domain, product } = body;

    if (!key || !domain) {
      console.log("[VALIDATE] ❌ Missing key or domain");
      await logValidation({
        licenseKey: key || "MISSING",
        domain: domain || "MISSING",
        product: product || null,
        result: "invalid",
        reason: "Missing required fields: key and domain",
        ip,
      });
      return NextResponse.json({
        valid: false,
        reason: "Missing required fields: key and domain",
      });
    }

    console.log("[VALIDATE] Key:", key, "Domain:", domain, "Product:", product || "any");

    // Find license with product relation
    const license = await prisma.license.findUnique({
      where: { key },
      include: { product: true },
    });

    // License not found
    if (!license) {
      console.log("[VALIDATE] ❌ License not found:", key);
      await logValidation({
        licenseKey: key,
        domain,
        product: product || null,
        result: "invalid",
        reason: "License not found",
        ip,
      });
      return NextResponse.json({
        valid: false,
        reason: "License not found",
      });
    }

    // Check status
    if (license.status !== "active") {
      console.log("[VALIDATE] ❌ License not active, status:", license.status);
      await logValidation({
        licenseKey: key,
        domain,
        product: product || null,
        result: "invalid",
        reason: `License status: ${license.status}`,
        ip,
      });
      return NextResponse.json({
        valid: false,
        reason: `License is ${license.status}`,
      });
    }

    // Strict domain validation
    const cleanedInput = cleanDomain(domain);
    const cleanedStored = cleanDomain(license.domain);

    if (cleanedInput !== cleanedStored) {
      console.log("[VALIDATE] ❌ Domain mismatch:", cleanedStored, "vs", cleanedInput);
      await logValidation({
        licenseKey: key,
        domain,
        product: product || null,
        result: "invalid",
        reason: `Domain mismatch: expected ${cleanedStored}, got ${cleanedInput}`,
        ip,
      });
      return NextResponse.json({
        valid: false,
        reason: "Domain mismatch. This license is bound to a different domain.",
      });
    }

    // Expiration check
    if (new Date() > license.expiresAt) {
      console.log("[VALIDATE] ❌ License expired:", license.expiresAt);
      // Auto-update status to expired
      await prisma.license.update({
        where: { id: license.id },
        data: { status: "expired" },
      });
      await logValidation({
        licenseKey: key,
        domain,
        product: product || null,
        result: "expired",
        reason: `License expired on ${license.expiresAt.toISOString()}`,
        ip,
      });
      return NextResponse.json({
        valid: false,
        reason: "License has expired",
      });
    }

    // Product compatibility check
    if (product && license.product) {
      if (license.product.code !== product.toUpperCase()) {
        console.log("[VALIDATE] ❌ Product mismatch:", license.product.code, "vs", product);
        await logValidation({
          licenseKey: key,
          domain,
          product,
          result: "invalid",
          reason: `Product mismatch: license is for ${license.product.code}, requested ${product}`,
          ip,
        });
        return NextResponse.json({
          valid: false,
          reason: `License is not valid for product: ${product}. This license is for: ${license.product.code}`,
        });
      }
    }

    // All checks passed
    const elapsed = Date.now() - startTime;
    console.log(`[VALIDATE] ✅ License valid (${elapsed}ms)`);

    await logValidation({
      licenseKey: key,
      domain,
      product: product || null,
      result: "valid",
      reason: null,
      ip,
    });

    return NextResponse.json({
      valid: true,
      license: {
        plan: license.plan,
        product: license.product?.code || null,
        expiresAt: license.expiresAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[VALIDATE] ❌ Server error:", err);
    return NextResponse.json(
      { valid: false, reason: "Internal server error" },
      { status: 500 }
    );
  }
}
