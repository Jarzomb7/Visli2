import { getSetting } from "./settings";
import { prisma } from "./prisma";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    const apiKey = await getSetting("RESEND_API_KEY", process.env.RESEND_API_KEY || "");
    const from = await getSetting("EMAIL_FROM", process.env.EMAIL_FROM || "VISLI <onboarding@resend.dev>");

    if (!apiKey) {
      console.warn("[EMAIL] ⚠️ RESEND_API_KEY not configured — skipping email to:", payload.to);
      return false;
    }

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    });

    if (error) {
      console.error("[EMAIL] ❌ Resend error:", error);
      return false;
    }

    console.log("[EMAIL] ✅ Sent to:", payload.to, "id:", data?.id);
    return true;
  } catch (err) {
    console.error("[EMAIL] ❌ Failed:", err);
    return false;
  }
}

export function replaceVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
}

export async function sendTemplateEmail(slug: string, to: string, vars: Record<string, string>): Promise<boolean> {
  const template = await prisma.emailTemplate.findUnique({ where: { slug } });
  if (!template) {
    console.warn("[EMAIL] Template not found:", slug, "— using fallback");
    return false;
  }

  const subject = replaceVariables(template.subject, vars);
  const html = replaceVariables(template.body, vars);

  return sendEmail({ to, subject, html });
}

export async function sendWelcomeEmail(params: {
  email: string;
  password: string;
  licenseKey: string;
  domain: string;
  plan: string;
  productName: string;
}): Promise<boolean> {
  const appUrl = await getSetting("APP_URL", process.env.NEXT_PUBLIC_APP_URL || "https://visli.io");
  const appName = await getSetting("APP_NAME", "VISLI");

  const vars: Record<string, string> = {
    email: params.email,
    password: params.password,
    license_key: params.licenseKey,
    domain: params.domain === "PENDING" ? "Will be set on first use" : params.domain,
    plan: params.plan,
    product_name: params.productName,
    app_name: appName,
    app_url: appUrl,
    login_url: `${appUrl}/login`,
    panel_url: `${appUrl}/client/dashboard`,
  };

  const sent = await sendTemplateEmail("welcome", params.email, vars);
  if (sent) return true;

  const html = `<p>Welcome to ${appName}.</p><p>Plan: ${params.plan}</p><p>License: ${params.licenseKey}</p><p><a href="${appUrl}/login">Log in</a></p>`;
  return sendEmail({ to: params.email, subject: `Welcome to ${appName}`, html });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const appUrl = await getSetting("APP_URL", process.env.NEXT_PUBLIC_APP_URL || "https://visli.io");
  const appName = await getSetting("APP_NAME", "VISLI");
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const vars = { email, reset_url: resetUrl, app_name: appName, app_url: appUrl, panel_url: `${appUrl}/client/dashboard` };
  const sent = await sendTemplateEmail("password-reset", email, vars);
  if (sent) return true;

  const html = `<p>Reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`;
  return sendEmail({ to: email, subject: `${appName} — Password Reset`, html });
}

async function sendSubscriptionEventEmail(params: {
  slug: string;
  fallbackSubject: string;
  email: string;
  plan: string;
  productName: string;
  renewalDate?: Date | null;
}): Promise<boolean> {
  const appUrl = await getSetting("APP_URL", process.env.NEXT_PUBLIC_APP_URL || "https://visli.io");
  const appName = await getSetting("APP_NAME", "VISLI");
  const renewal = params.renewalDate ? params.renewalDate.toISOString().split("T")[0] : "—";

  const vars = {
    email: params.email,
    plan: params.plan,
    product_name: params.productName,
    renewal_date: renewal,
    app_name: appName,
    app_url: appUrl,
    panel_url: `${appUrl}/client/billing`,
  };

  const sent = await sendTemplateEmail(params.slug, params.email, vars);
  if (sent) return true;

  const html = `<p>${params.fallbackSubject}</p><p>Plan: ${params.plan}</p><p>Product: ${params.productName}</p><p>Renewal: ${renewal}</p><p><a href="${appUrl}/client/billing">Billing panel</a></p>`;
  return sendEmail({ to: params.email, subject: `${appName} — ${params.fallbackSubject}`, html });
}

export async function sendPaymentSuccessEmail(params: { email: string; plan: string; productName: string; renewalDate?: Date | null }): Promise<boolean> {
  return sendSubscriptionEventEmail({ slug: "payment-success", fallbackSubject: "Payment received", ...params });
}

export async function sendPaymentFailedEmail(params: { email: string; plan: string; productName: string; renewalDate?: Date | null }): Promise<boolean> {
  return sendSubscriptionEventEmail({ slug: "payment-failed", fallbackSubject: "Payment failed", ...params });
}

export async function sendRenewalReminderEmail(params: { email: string; plan: string; productName: string; renewalDate?: Date | null }): Promise<boolean> {
  return sendSubscriptionEventEmail({ slug: "renewal-reminder", fallbackSubject: "Renewal reminder", ...params });
}

export async function sendCancellationEmail(params: { email: string; plan: string; productName: string; renewalDate?: Date | null }): Promise<boolean> {
  return sendSubscriptionEventEmail({ slug: "subscription-cancellation", fallbackSubject: "Subscription canceled", ...params });
}
