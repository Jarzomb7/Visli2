import { v4 as uuidv4 } from "uuid";

export function generateLicenseKey(): string {
  const raw = uuidv4().replace(/-/g, "").toUpperCase();
  return `VISLI-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

export function getExpirationDate(duration: string): Date {
  const now = new Date();
  const monthsMap: Record<string, number> = {
    "1m": 1,
    "3m": 3,
    "6m": 6,
    "12m": 12,
  };
  const months = monthsMap[duration] || 1;
  now.setMonth(now.getMonth() + months);
  return now;
}
