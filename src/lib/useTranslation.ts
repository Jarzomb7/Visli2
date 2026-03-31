"use client";

import { useState, useEffect, useCallback } from "react";
import { t, type Lang } from "@/lib/i18n";

export function useTranslation() {
  const [lang, setLangState] = useState<Lang>("pl");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("visli_lang") as Lang | null : null;
    if (stored === "pl" || stored === "en") setLangState(stored);

    // Try to sync from server (safe — if language column doesn't exist, we just ignore)
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      const serverLang = d.user?.language;
      if (serverLang === "pl" || serverLang === "en") {
        setLangState(serverLang);
        localStorage.setItem("visli_lang", serverLang);
      }
    }).catch(() => {});
  }, []);

  const setLang = useCallback(async (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("visli_lang", newLang);
    try { await fetch("/api/auth/language", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: newLang }) }); } catch {}
  }, []);

  const translate = useCallback(
  (key: string, vars?: Record<string, string>) => t(key, vars),
  []
);

  return { t: translate, lang, setLang };
}
