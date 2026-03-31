// Alias route: /api/webhooks/stripe → /api/stripe/webhook
// Both paths will accept Stripe webhooks so either can be configured in Stripe Dashboard.
export { POST } from "@/app/api/stripe/webhook/route";
export const dynamic = "force-dynamic";
