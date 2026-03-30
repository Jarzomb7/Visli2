import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function GET() {
  const stripe = await getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: "price_1TGdtTD7jl953OCG2UpfGbmL",
        quantity: 1,
      },
    ],
    success_url: "https://visli2.vercel.app/dashboard",
    cancel_url: "https://visli2.vercel.app/dashboard",
  });

  return NextResponse.redirect(session.url!);
}
