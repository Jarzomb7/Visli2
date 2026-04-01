import { NextResponse } from "next/server";
import { getClientSession } from "@/lib/auth";
import { getPlanProductMappings } from "@/lib/plans";
import { getActiveProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [plans, products] = await Promise.all([
    getPlanProductMappings(true),
    getActiveProducts(),
  ]);

  return NextResponse.json({ plans, products });
}
