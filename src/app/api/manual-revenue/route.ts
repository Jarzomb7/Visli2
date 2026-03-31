import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await prisma.manualRevenue.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json({ entries });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { amount?: number; type?: string; date?: string };
  if (typeof body.amount !== "number" || !body.type) {
    return NextResponse.json({ error: "amount and type required" }, { status: 400 });
  }

  const entry = await prisma.manualRevenue.create({
    data: {
      amount: body.amount,
      type: body.type,
      date: body.date ? new Date(body.date) : new Date(),
    },
  });

  return NextResponse.json({ entry });
}
