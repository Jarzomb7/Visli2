import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get active subscription with product + license
    const subscription = await prisma.subscription.findFirst({
      where: {
        OR: [{ email: session.email }, { userId: session.id }],
        status: { in: ["active", "past_due"] },
      },
      include: {
        product: { select: { name: true, code: true, priceCents: true, paymentType: true } },
        license: { select: { key: true, domain: true, status: true, expiresAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const assignedLicenses = await prisma.license.findMany({
      where: {
        OR: [
          { email: session.email },
          { subscription: { userId: session.id } },
        ],
      },
      select: { id: true, key: true, domain: true, status: true, expiresAt: true, plan: true },
      orderBy: { createdAt: "desc" },
    });

    // Fetch invoices from Stripe if customer exists
    let invoices: { id: string; date: string; amount: number; status: string; url: string | null }[] = [];
    if (subscription?.stripeCustomerId) {
      try {
        const stripe = await getStripe();
        const stripeInvoices = await stripe.invoices.list({
          customer: subscription.stripeCustomerId,
          limit: 20,
        });
        invoices = stripeInvoices.data.map((inv) => ({
          id: inv.id,
          date: new Date((inv.created || 0) * 1000).toISOString(),
          amount: (inv.amount_paid || 0) / 100,
          status: inv.status || "unknown",
          url: inv.hosted_invoice_url || null,
        }));
      } catch (err) {
        console.error("[CLIENT-BILLING] Stripe invoice fetch error:", err);
      }
    }

    return NextResponse.json({ subscription, invoices, assignedLicenses });
  } catch (err) {
    console.error("[CLIENT-BILLING] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
