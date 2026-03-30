import { getSetting } from "./settings";
import { prisma } from "./prisma";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/** Send email via Resend API */
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

/** Replace {{variable}} placeholders in a template string */
export function replaceVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
}

/** Load a template from DB by slug, replace variables, and send */
export async function sendTemplateEmail(
  slug: string,
  to: string,
  vars: Record<string, string>
): Promise<boolean> {
  const template = await prisma.emailTemplate.findUnique({ where: { slug } });
  if (!template) {
    console.warn("[EMAIL] Template not found:", slug, "— using fallback");
    return false;
  }

  const subject = replaceVariables(template.subject, vars);
  const html = replaceVariables(template.body, vars);

  return sendEmail({ to, subject, html });
}

/** Send welcome email — uses DB template if it exists, otherwise built-in */
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
  };

  // Try DB template first
  const sent = await sendTemplateEmail("welcome", params.email, vars);
  if (sent) return true;

  // Built-in fallback
  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#060d2b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
<div style="text-align:center;margin-bottom:32px;">
  <h1 style="color:#fff;font-size:24px;margin:0 0 8px;">Welcome to ${appName}!</h1>
  <p style="color:#ffffff80;font-size:14px;margin:0;">Your subscription is now active.</p>
</div>
<div style="background:#0f1740;border:1px solid #ffffff10;border-radius:16px;padding:32px;margin-bottom:24px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;border-bottom:1px solid #ffffff08;width:120px;">Email</td><td style="padding:10px 0;color:#5f83f4;font-size:13px;border-bottom:1px solid #ffffff08;font-family:monospace;">${params.email}</td></tr>
    <tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;border-bottom:1px solid #ffffff08;">Password</td><td style="padding:10px 0;color:#f59e0b;font-size:13px;border-bottom:1px solid #ffffff08;font-family:monospace;">${params.password}</td></tr>
    <tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;border-bottom:1px solid #ffffff08;">License Key</td><td style="padding:10px 0;color:#10b981;font-size:13px;border-bottom:1px solid #ffffff08;font-family:monospace;word-break:break-all;">${params.licenseKey}</td></tr>
    <tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;border-bottom:1px solid #ffffff08;">Product</td><td style="padding:10px 0;color:#ffffffcc;font-size:13px;border-bottom:1px solid #ffffff08;">${params.productName}</td></tr>
    <tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;">Plan</td><td style="padding:10px 0;color:#ffffffcc;font-size:13px;">${params.plan}</td></tr>
  </table>
</div>
<div style="text-align:center;"><a href="${appUrl}/login" style="display:inline-block;background:linear-gradient(135deg,#3b5eee,#1e3fdb);color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:12px;">Log In to Your Panel</a></div>
</div>
</body></html>`;

  return sendEmail({ to: params.email, subject: `Welcome to ${appName}`, html });
}

/** Send password reset email */
export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const appUrl = await getSetting("APP_URL", process.env.NEXT_PUBLIC_APP_URL || "https://visli.io");
  const appName = await getSetting("APP_NAME", "VISLI");
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const vars = { email, reset_url: resetUrl, app_name: appName, app_url: appUrl };
  const sent = await sendTemplateEmail("password-reset", email, vars);
  if (sent) return true;

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#060d2b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
<div style="text-align:center;margin-bottom:32px;">
  <h1 style="color:#fff;font-size:24px;margin:0 0 8px;">Reset Your Password</h1>
  <p style="color:#ffffff80;font-size:14px;margin:0;">Click below to set a new password.</p>
</div>
<div style="text-align:center;margin-bottom:24px;">
  <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b5eee,#1e3fdb);color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:12px;">Reset Password</a>
</div>
<p style="color:#ffffff40;font-size:12px;text-align:center;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
</div>
</body></html>`;

  return sendEmail({ to: email, subject: `${appName} — Password Reset`, html });
}
