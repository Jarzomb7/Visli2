import { prisma } from "./prisma";

// In-memory cache: key → { value, ts }
const cache = new Map<string, { value: string; ts: number }>();
const CACHE_TTL = 60_000; // 60 seconds

export async function getSetting(key: string, fallback?: string): Promise<string> {
  // Check cache first
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.value;
  }

  try {
    const setting = await prisma.setting.findUnique({ where: { key } });
    if (setting) {
      cache.set(key, { value: setting.value, ts: Date.now() });
      return setting.value;
    }
  } catch (err) {
    console.error("[SETTINGS] Error reading:", key, err);
  }

  // Fallback to env variable, then to provided default
  const envValue = process.env[key];
  if (envValue) return envValue;

  return fallback || "";
}

export async function setSetting(key: string, value: string, group?: string, label?: string): Promise<void> {
  try {
    await prisma.setting.upsert({
      where: { key },
      update: { value, ...(group ? { group } : {}), ...(label ? { label } : {}) },
      create: { key, value, group: group || "general", label: label || key },
    });
    // Update cache
    cache.set(key, { value, ts: Date.now() });
    console.log("[SETTINGS] ✅ Set:", key);
  } catch (err) {
    console.error("[SETTINGS] Error writing:", key, err);
    throw err;
  }
}

export async function getSettings(group?: string): Promise<Record<string, string>> {
  try {
    const where = group ? { group } : {};
    const settings = await prisma.setting.findMany({ where, orderBy: [{ group: "asc" }, { key: "asc" }] });
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
      cache.set(s.key, { value: s.value, ts: Date.now() });
    }
    return result;
  } catch (err) {
    console.error("[SETTINGS] Error reading all:", err);
    return {};
  }
}

export async function getAllSettingsWithMeta(): Promise<
  { id: number; key: string; value: string; group: string; label: string | null; encrypted: boolean }[]
> {
  try {
    return await prisma.setting.findMany({ orderBy: [{ group: "asc" }, { key: "asc" }] });
  } catch (err) {
    console.error("[SETTINGS] Error:", err);
    return [];
  }
}

export async function bulkSetSettings(entries: { key: string; value: string; group: string; label?: string }[]): Promise<void> {
  for (const entry of entries) {
    await setSetting(entry.key, entry.value, entry.group, entry.label);
  }
}

export function clearSettingsCache(): void {
  cache.clear();
  console.log("[SETTINGS] Cache cleared");
}

// Sensitive keys that should be masked in UI
export const SENSITIVE_KEYS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SMS_API_KEY",
  "SMTP_PASS",
  "RESEND_API_KEY",
];

export function maskValue(key: string, value: string): string {
  if (SENSITIVE_KEYS.includes(key) && value.length > 8) {
    return value.slice(0, 4) + "••••" + value.slice(-4);
  }
  return value;
}

// Default settings schema for UI rendering
export const SETTINGS_SCHEMA = [
  { group: "stripe", key: "STRIPE_SECRET_KEY", label: "Stripe Secret Key", placeholder: "sk_live_..." },
  { group: "stripe", key: "STRIPE_WEBHOOK_SECRET", label: "Webhook Secret", placeholder: "whsec_..." },
  { group: "stripe", key: "STRIPE_PRICE_BOOKING_BASIC", label: "Booking Basic Price ID", placeholder: "price_..." },
  { group: "stripe", key: "STRIPE_PRICE_BOOKING_PRO", label: "Booking Pro Price ID", placeholder: "price_..." },
  { group: "stripe", key: "STRIPE_PRICE_CHATBOT_BASIC", label: "Chatbot Basic Price ID", placeholder: "price_..." },
  { group: "stripe", key: "STRIPE_PRICE_CHATBOT_PRO", label: "Chatbot Pro Price ID", placeholder: "price_..." },
  { group: "google", key: "GOOGLE_ANALYTICS_ID", label: "Google Analytics ID", placeholder: "G-XXXXXXXXXX" },
  { group: "app", key: "APP_NAME", label: "Application Name", placeholder: "VISLI" },
  { group: "app", key: "APP_URL", label: "Application URL", placeholder: "https://..." },
  { group: "app", key: "LICENSE_API_URL", label: "License API URL", placeholder: "https://api.example.com/..." },
  { group: "app", key: "SUPPORT_EMAIL", label: "Support Email", placeholder: "support@..." },
  { group: "analytics", key: "GA_MEASUREMENT_ID", label: "GA Measurement ID", placeholder: "G-XXXXXXXXXX" },
  { group: "analytics", key: "ANALYTICS_ENABLED", label: "Enable Analytics", placeholder: "true / false" },
  { group: "sms", key: "SMS_PROVIDER", label: "SMS Provider", placeholder: "twilio / vonage / plivo" },
  { group: "sms", key: "SMS_API_KEY", label: "SMS API Key", placeholder: "..." },
  { group: "sms", key: "SMS_FROM_NUMBER", label: "SMS From Number", placeholder: "+1..." },
  { group: "email", key: "RESEND_API_KEY", label: "Resend API Key", placeholder: "re_..." },
  { group: "email", key: "EMAIL_FROM", label: "From Address", placeholder: "VISLI <noreply@yourdomain.com>" },
];
