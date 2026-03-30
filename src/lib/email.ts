import { getSetting } from "./settings";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using nodemailer with SMTP settings from DB/env.
 * Falls back gracefully — logs instead of crashing if SMTP is not configured.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    const host = await getSetting("SMTP_HOST");
    const port = await getSetting("SMTP_PORT", "587");
    const user = await getSetting("SMTP_USER");
    const pass = await getSetting("SMTP_PASS");
    const from = await getSetting("SMTP_FROM", user || "noreply@visli.io");

    if (!host || !user || !pass) {
      console.warn("[EMAIL] ⚠️ SMTP not configured — skipping email to:", payload.to);
      console.log("[EMAIL] Subject:", payload.subject);
      return false;
    }

    const nodemailer = await import("nodemailer");

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: parseInt(port, 10) === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text || payload.html.replace(/<[^>]+>/g, ""),
    });

    console.log("[EMAIL] ✅ Email sent to:", payload.to);
    return true;
  } catch (err) {
    console.error("[EMAIL] ❌ Failed to send email to:", payload.to, err);
    return false;
  }
}

/**
 * Send welcome email after successful Stripe purchase.
 */
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

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#060d2b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#3b5eee,#1e3fdb);border-radius:16px;padding:12px;margin-bottom:16px;">
        <span style="font-size:24px;color:#fff;font-weight:bold;">${appName}</span>
      </div>
      <h1 style="color:#ffffff;font-size:24px;margin:0 0 8px;">Welcome to ${appName}!</h1>
      <p style="color:#ffffff80;font-size:14px;margin:0;">Your subscription is now active.</p>
    </div>
    <div style="background:#0f1740;border:1px solid #ffffff10;border-radius:16px;padding:32px;margin-bottom:24px;">
      <h2 style="color:#ffffff;font-size:16px;margin:0 0 20px;">Your Account Details</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;border-bottom:1px solid #ffffff08;width:120px;">Email / Login</td><td style="padding:10px 0;color:#5f83f4;font-size:13px;border-bottom:1px solid #ffffff08;font-family:monospace;">${params.email}</td></tr>
        <tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;border-bottom:1px solid #ffffff08;">Password</td><td style="padding:10px 0;color:#f59e0b;font-size:13px;border-bottom:1px solid #ffffff08;font-family:monospace;">${params.password}</td></tr>
        <tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;border-bottom:1px solid #ffffff08;">License Key</td><td style="padding:10px 0;color:#10b981;font-size:13px;border-bottom:1px solid #ffffff08;font-family:monospace;word-break:break-all;">${params.licenseKey}</td></tr>
        <tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;border-bottom:1px solid #ffffff08;">Product</td><td style="padding:10px 0;color:#ffffffcc;font-size:13px;border-bottom:1px solid #ffffff08;">${params.productName}</td></tr>
        <tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;border-bottom:1px solid #ffffff08;">Plan</td><td style="padding:10px 0;color:#ffffffcc;font-size:13px;border-bottom:1px solid #ffffff08;text-transform:uppercase;">${params.plan}</td></tr>
        <tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;">Domain</td><td style="padding:10px 0;color:#ffffffcc;font-size:13px;">${params.domain === "PENDING" ? '<span style="color:#f59e0b;">Will be set on first use</span>' : params.domain}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${appUrl}/login" style="display:inline-block;background:linear-gradient(135deg,#3b5eee,#1e3fdb);color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:12px;">Log In to Your Panel</a>
    </div>
    <div style="background:#0f1740;border:1px solid #f59e0b20;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="color:#f59e0b;font-size:12px;margin:0;line-height:1.5;">Please change your password after first login.</p>
    </div>
    <div style="text-align:center;"><p style="color:#ffffff30;font-size:11px;margin:0;">${appName} License Server</p></div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: params.email,
    subject: `Welcome to ${appName} — Your License Key & Login`,
    html,
    text: `Welcome to ${appName}!\n\nEmail: ${params.email}\nPassword: ${params.password}\nLicense Key: ${params.licenseKey}\nProduct: ${params.productName}\nPlan: ${params.plan}\nDomain: ${params.domain}\n\nLog in: ${appUrl}/login`,
  });
}
