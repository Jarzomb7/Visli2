import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const licenses = await prisma.license.findMany({
      where: { email: session.email },
      include: { product: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ licenses });
  } catch (err) {
    console.error("[CLIENT-LIC] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
