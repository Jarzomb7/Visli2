import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function GET() {
  const stripe = await getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: "TU_WKLEJ_PRICE_ID",
        quantity: 1,
      },
    ],
    success_url: "https://visli2.vercel.app/dashboard",
    cancel_url: "https://visli2.vercel.app/dashboard",
  });

  return NextResponse.redirect(session.url!);
}
