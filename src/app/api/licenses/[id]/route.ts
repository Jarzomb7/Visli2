import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const license = await prisma.license.findUnique({ where: { id } });
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
    const session = await getSession();
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
      updateData.domain = body.domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
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

    const license = await prisma.license.update({
      where: { id },
      data: updateData,
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
    const session = await getSession();
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
