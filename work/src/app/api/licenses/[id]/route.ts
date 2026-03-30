import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const license = await prisma.license.findUnique({
      where: { id },
      include: { product: { select: { id: true, name: true, code: true } } },
    });
    if (!license) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    return NextResponse.json({ license });
  } catch (err) {
    console.error("[LICENSE GET] Error:", err);
    return NextResponse.json({ error: "Failed to fetch license" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof body.domain === "string") {
      updateData.domain = body.domain.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").replace(/:\d+$/, "").replace(/\/$/, "");
    }
    if (body.plan === "basic" || body.plan === "pro") {
      updateData.plan = body.plan;
    }
    if (body.status === "active" || body.status === "expired" || body.status === "suspended") {
      updateData.status = body.status;
    }
    if (typeof body.expiresAt === "string") {
      updateData.expiresAt = new Date(body.expiresAt);
    }
    if (typeof body.productId === "number") {
      updateData.productId = body.productId;
    }
    if (body.productId === null) {
      updateData.productId = null;
    }

    const license = await prisma.license.update({
      where: { id },
      data: updateData,
      include: { product: true },
    });

    console.log("[LICENSE PATCH] ✅ Updated license:", license.id);
    return NextResponse.json({ success: true, license });
  } catch (err) {
    console.error("[LICENSE PATCH] Error:", err);
    return NextResponse.json({ error: "Failed to update license" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await prisma.license.delete({ where: { id } });
    console.log("[LICENSE DELETE] ✅ Deleted license:", id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[LICENSE DELETE] Error:", err);
    return NextResponse.json({ error: "Failed to delete license" }, { status: 500 });
  }
}
