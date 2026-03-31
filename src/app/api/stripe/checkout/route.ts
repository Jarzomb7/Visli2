import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type CheckoutBody = {
  email?: string;
  planId?: number;
  addonPackageId?: string;
};

const smsPackages: Record<string, { amount: number; credits: number }> = {
  sms_100: { amount: 2000, credits: 100 },
  sms_500: { amount: 8000, credits: 500 },
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const { email, planId, addonPackageId } = body;
    const stripe = await getStripe();

    if (addonPackageId) {
      const pkg = smsPackages[addonPackageId];
      if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 });

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "pln",
              product_data: { name: `${pkg.credits} SMS` },
              unit_amount: pkg.amount,
            },
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
        customer_email: email,
      });

      return NextResponse.json({ url: session.url });
    }

    if (!planId) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.stripePriceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
      customer_email: email,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
