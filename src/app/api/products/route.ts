import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, ensureProductsExist } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureProductsExist();

    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ products });
  } catch (err) {
    console.error("[PRODUCTS] Error:", err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
