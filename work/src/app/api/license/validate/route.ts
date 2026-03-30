import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFeaturesForLicense } from "@/lib/features";

export const dynamic = "force-dynamic";

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
    await prisma.validationLog.create({ data: {
      licenseKey: data.licenseKey,
      domain: data.domain,
      product: data.product,
      result: data.result,
      reason: data.reason,
      ip: data.ip,
    }});
  } catch (err) {
    console.error("[VALIDATE-LOG] Failed to write log:", err);
  }
}

async function logUsage(licenseId: number, event: string, ip: string | null, meta?: string) {
  try {
    await prisma.usageLog.create({ data: { licenseId, event, ip, meta } });
  } catch (err) {
    console.error("[USAGE-LOG] Failed to write:", err);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

  console.log("[VALIDATE] ===== License validation request =====");

  try {
    let body: { key?: string; domain?: string; product?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ valid: false, reason: "Invalid request body" }, { status: 400 });
    }

    const { key, domain, product } = body;

    if (!key || !domain) {
      await logValidation({ licenseKey: key || "MISSING", domain: domain || "MISSING", product: product || null, result: "invalid", reason: "Missing required fields", ip });
      return NextResponse.json({ valid: false, reason: "Missing required fields: key and domain" });
    }

    console.log("[VALIDATE] Key:", key, "Domain:", domain, "Product:", product || "any");

    const license = await prisma.license.findUnique({
      where: { key },
      include: { product: true },
    });

    if (!license) {
      await logValidation({ licenseKey: key, domain, product: product || null, result: "invalid", reason: "License not found", ip });
      return NextResponse.json({ valid: false, reason: "License not found" });
    }

    // Check status
    if (license.status !== "active") {
      await logUsage(license.id, "validation_failed", ip, `status:${license.status}`);
      await logValidation({ licenseKey: key, domain, product: product || null, result: "invalid", reason: `License status: ${license.status}`, ip });
      return NextResponse.json({ valid: false, reason: `License is ${license.status}` });
    }

    // Domain lock logic
    const cleanedInput = cleanDomain(domain);
    const cleanedStored = cleanDomain(license.domain);

    if (!license.domainLocked && cleanedStored === "" && cleanedInput !== "") {
      // First validation: lock domain
      await prisma.license.update({
        where: { id: license.id },
        data: { domain: cleanedInput, domainLocked: true },
      });
      console.log("[VALIDATE] 🔒 Domain locked to:", cleanedInput);
    } else if (license.domainLocked || cleanedStored !== "") {
      // Subsequent validations: enforce match
      const compareDomain = cleanedStored || cleanedInput;
      if (cleanedInput !== compareDomain) {
        await logUsage(license.id, "domain_mismatch", ip, `expected:${compareDomain},got:${cleanedInput}`);
        await logValidation({ licenseKey: key, domain, product: product || null, result: "invalid", reason: `Domain mismatch: expected ${compareDomain}`, ip });
        return NextResponse.json({ valid: false, reason: "Domain mismatch. This license is bound to a different domain." });
      }
    }

    // Expiration check
    if (new Date() > license.expiresAt) {
      await prisma.license.update({ where: { id: license.id }, data: { status: "expired" } });
      await logUsage(license.id, "validation_expired", ip);
      await logValidation({ licenseKey: key, domain, product: product || null, result: "expired", reason: "License expired", ip });
      return NextResponse.json({ valid: false, reason: "License has expired" });
    }

    // Product compatibility
    if (product && license.product) {
      if (license.product.code !== product.toUpperCase()) {
        await logUsage(license.id, "product_mismatch", ip, `expected:${license.product.code},got:${product}`);
        await logValidation({ licenseKey: key, domain, product, result: "invalid", reason: `Product mismatch`, ip });
        return NextResponse.json({ valid: false, reason: `License is for ${license.product.code}, not ${product}` });
      }
    }

    // All checks passed - resolve features from DB
    const resolvedFeatures = await getFeaturesForLicense(license.id);
    const elapsed = Date.now() - startTime;
    console.log(`[VALIDATE] ✅ License valid (${elapsed}ms), features: ${resolvedFeatures.join(",")}`);

    await logUsage(license.id, "validation_success", ip);
    await logValidation({ licenseKey: key, domain, product: product || null, result: "valid", reason: null, ip });

    return NextResponse.json({
      valid: true,
      features: resolvedFeatures,
      plan: license.plan,
      expiresAt: license.expiresAt.toISOString(),
      product: license.product?.code || null,
    });
  } catch (err) {
    console.error("[VALIDATE] ❌ Server error:", err);
    return NextResponse.json({ valid: false, reason: "Internal server error" }, { status: 500 });
  }
}
