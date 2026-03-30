import { NextResponse } from "next/server";
import { getStripe, isValidStripePriceId } from "@/lib/stripe";
import { getSetting } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productCode = searchParams.get("product") || "";

    if (!productCode) {
      const products = await prisma.product.findMany({ where: { active: true, stripePriceId: { not: null } }, select: { code: true, name: true } });
      return NextResponse.json({ error: "Provide ?product=CODE", availableProducts: products }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { code: productCode.toUpperCase() } });
    if (!product?.stripePriceId || !isValidStripePriceId(product.stripePriceId)) {
      return NextResponse.json({ error: `No valid price for product: ${productCode}` }, { status: 400 });
    }

    const appUrl = await getSetting("APP_URL", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
    const stripe = await getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: product.paymentType === "subscription" ? "subscription" : "payment",
      payment_method_types: ["card"],
      line_items: [{ price: product.stripePriceId, quantity: 1 }],
      metadata: { productCode: product.code, plan: product.paymentType, domain: "PENDING" },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel`,
    });

    return NextResponse.redirect(session.url!);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
