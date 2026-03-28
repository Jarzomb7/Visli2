import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const license = await prisma.license.findUnique({ where: { id } });
    if (!license || license.email !== session.email) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    let body: { domain?: string };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

    if (!body.domain || body.domain.trim().length < 3) {
      return NextResponse.json({ error: "Valid domain is required" }, { status: 400 });
    }

    const cleanDomain = body.domain.toLowerCase().trim()
      .replace(/^https?:\/\//, "").replace(/^www\./, "")
      .replace(/\/.*$/, "").replace(/:\d+$/, "");

    // If domain is locked to a real domain, prevent change
    if (license.domainLocked && license.domain !== "PENDING" && license.domain !== "") {
      return NextResponse.json({ error: "Domain is locked. Contact support to change." }, { status: 403 });
    }

    await prisma.license.update({
      where: { id },
      data: { domain: cleanDomain, domainLocked: true },
    });

    console.log("[CLIENT-DOMAIN] ✅ Domain set to:", cleanDomain, "for license:", license.key);

    return NextResponse.json({ success: true, domain: cleanDomain });
  } catch (err) {
    console.error("[CLIENT-DOMAIN] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
