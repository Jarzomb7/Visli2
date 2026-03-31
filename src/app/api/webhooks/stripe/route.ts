import { NextRequest } from "next/server";
import { POST as handleWebhook } from "@/app/api/stripe/webhook/route";

export const dynamic = "force-dynamic";

// Wrapper function — NOT a re-export. This is a real function call
// which works reliably on Vercel serverless (re-exports sometimes don't).
export async function POST(request: NextRequest) {
  return handleWebhook(request);
}
