import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { sendEmail, replaceVariables } from "@/lib/email";

export const dynamic = "force-dynamic";

const DEFAULT_TEMPLATES = [
  {
    slug: "welcome",
    name: "Welcome Email",
    subject: "Welcome to {{app_name}} — Your License Key & Login",
    body: `<div style="max-width:600px;margin:0 auto;padding:40px 20px;background:#060d2b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="text-align:center;margin-bottom:32px;">
<h1 style="color:#fff;font-size:24px;margin:0 0 8px;">Welcome to {{app_name}}!</h1>
<p style="color:#ffffff80;font-size:14px;margin:0;">Your subscription is now active.</p>
</div>
<div style="background:#0f1740;border:1px solid #ffffff10;border-radius:16px;padding:32px;margin-bottom:24px;">
<table style="width:100%;border-collapse:collapse;">
<tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;border-bottom:1px solid #ffffff08;width:120px;">Email</td><td style="padding:10px 0;color:#5f83f4;font-size:13px;border-bottom:1px solid #ffffff08;font-family:monospace;">{{email}}</td></tr>
<tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;border-bottom:1px solid #ffffff08;">Password</td><td style="padding:10px 0;color:#f59e0b;font-size:13px;border-bottom:1px solid #ffffff08;font-family:monospace;">{{password}}</td></tr>
<tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;border-bottom:1px solid #ffffff08;">License Key</td><td style="padding:10px 0;color:#10b981;font-size:13px;border-bottom:1px solid #ffffff08;font-family:monospace;">{{license_key}}</td></tr>
<tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;border-bottom:1px solid #ffffff08;">Product</td><td style="padding:10px 0;color:#ffffffcc;font-size:13px;border-bottom:1px solid #ffffff08;">{{product_name}}</td></tr>
<tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;">Domain</td><td style="padding:10px 0;color:#ffffffcc;font-size:13px;">{{domain}}</td></tr>
</table>
</div>
<div style="text-align:center;"><a href="{{login_url}}" style="display:inline-block;background:linear-gradient(135deg,#3b5eee,#1e3fdb);color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:12px;">Log In to Your Panel</a></div>
</div>`,
  },
  {
    slug: "license",
    name: "License Issued",
    subject: "{{app_name}} — Your License Key",
    body: `<div style="max-width:600px;margin:0 auto;padding:40px 20px;background:#060d2b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="text-align:center;margin-bottom:32px;">
<h1 style="color:#fff;font-size:24px;margin:0 0 8px;">Your License Key</h1>
<p style="color:#ffffff80;font-size:14px;margin:0;">Here is your license information for {{product_name}}.</p>
</div>
<div style="background:#0f1740;border:1px solid #ffffff10;border-radius:16px;padding:32px;margin-bottom:24px;">
<table style="width:100%;border-collapse:collapse;">
<tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;border-bottom:1px solid #ffffff08;width:120px;">License Key</td><td style="padding:10px 0;color:#10b981;font-size:13px;border-bottom:1px solid #ffffff08;font-family:monospace;word-break:break-all;">{{license_key}}</td></tr>
<tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;border-bottom:1px solid #ffffff08;">Domain</td><td style="padding:10px 0;color:#ffffffcc;font-size:13px;border-bottom:1px solid #ffffff08;">{{domain}}</td></tr>
<tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;">Plan</td><td style="padding:10px 0;color:#ffffffcc;font-size:13px;">{{plan}}</td></tr>
</table>
</div>
<div style="text-align:center;"><a href="{{panel_url}}" style="display:inline-block;background:linear-gradient(135deg,#3b5eee,#1e3fdb);color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:12px;">Go to Panel</a></div>
</div>`,
  },
  {
    slug: "password-reset",
    name: "Password Reset",
    subject: "{{app_name}} — Reset Your Password",
    body: `<div style="max-width:600px;margin:0 auto;padding:40px 20px;background:#060d2b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="text-align:center;margin-bottom:32px;">
<h1 style="color:#fff;font-size:24px;margin:0 0 8px;">Reset Your Password</h1>
<p style="color:#ffffff80;font-size:14px;margin:0;">Click the button below to set a new password.</p>
</div>
<div style="text-align:center;margin-bottom:24px;">
<a href="{{reset_url}}" style="display:inline-block;background:linear-gradient(135deg,#3b5eee,#1e3fdb);color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:12px;">Reset Password</a>
</div>
<p style="color:#ffffff40;font-size:12px;text-align:center;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
</div>`,
  },
  {
    slug: "subscription",
    name: "Subscription Confirmation",
    subject: "{{app_name}} — Subscription Active",
    body: `<div style="max-width:600px;margin:0 auto;padding:40px 20px;background:#060d2b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="text-align:center;margin-bottom:32px;">
<h1 style="color:#fff;font-size:24px;margin:0 0 8px;">Subscription Active!</h1>
<p style="color:#ffffff80;font-size:14px;margin:0;">Your {{product_name}} subscription is now active.</p>
</div>
<div style="background:#0f1740;border:1px solid #ffffff10;border-radius:16px;padding:32px;margin-bottom:24px;">
<table style="width:100%;border-collapse:collapse;">
<tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;border-bottom:1px solid #ffffff08;width:120px;">Email</td><td style="padding:10px 0;color:#5f83f4;font-size:13px;border-bottom:1px solid #ffffff08;font-family:monospace;">{{email}}</td></tr>
<tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;border-bottom:1px solid #ffffff08;">Product</td><td style="padding:10px 0;color:#ffffffcc;font-size:13px;border-bottom:1px solid #ffffff08;">{{product_name}}</td></tr>
<tr><td style="padding:10px 0;color:#ffffff60;font-size:13px;">Plan</td><td style="padding:10px 0;color:#ffffffcc;font-size:13px;">{{plan}}</td></tr>
</table>
</div>
<div style="text-align:center;"><a href="{{panel_url}}" style="display:inline-block;background:linear-gradient(135deg,#3b5eee,#1e3fdb);color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:12px;">Go to Panel</a></div>
</div>`,
  },
];

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Auto-seed default templates if none exist
    const count = await prisma.emailTemplate.count();
    if (count === 0) {
      for (const t of DEFAULT_TEMPLATES) {
        await prisma.emailTemplate.upsert({
          where: { slug: t.slug },
          update: {},
          create: t,
        });
      }
    }

    const templates = await prisma.emailTemplate.findMany({ orderBy: { slug: "asc" } });
    return NextResponse.json({ templates });
  } catch (err) {
    console.error("[EMAIL-TPL] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, subject, body: tplBody } = body;

    if (!id) return NextResponse.json({ error: "Template ID required" }, { status: 400 });

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(subject !== undefined ? { subject } : {}),
        ...(tplBody !== undefined ? { body: tplBody } : {}),
      },
    });

    return NextResponse.json({ template });
  } catch (err) {
    console.error("[EMAIL-TPL] Update error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    // Send test email
    if (body.action === "test") {
      const template = await prisma.emailTemplate.findUnique({ where: { id: body.id } });
      if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

      const testVars: Record<string, string> = {
        email: session.email,
        password: "TestPass123!",
        license_key: "VISLI-TEST-1234-5678-ABCD",
        domain: "example.com",
        plan: "subscription",
        product_name: "Test Product",
        app_name: "VISLI",
        app_url: "https://visli.io",
        login_url: "https://visli.io/login",
        reset_url: "https://visli.io/reset-password?token=test",
        panel_url: "https://visli.io/client/dashboard",
      };

      const subject = replaceVariables(template.subject, testVars);
      const html = replaceVariables(template.body, testVars);

      const sent = await sendEmail({ to: session.email, subject: `[TEST] ${subject}`, html });
      return NextResponse.json({ sent });
    }

    // Create new template
    const { slug, name, subject, body: tplBody } = body;
    if (!slug || !name) return NextResponse.json({ error: "slug and name required" }, { status: 400 });

    const template = await prisma.emailTemplate.create({
      data: { slug, name, subject: subject || "", body: tplBody || "" },
    });
    return NextResponse.json({ template });
  } catch (err) {
    console.error("[EMAIL-TPL] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
