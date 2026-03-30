"use client";

import { useState, useEffect, useCallback } from "react";
import { t, type Lang } from "@/lib/i18n";

export function useTranslation() {
  const [lang, setLangState] = useState<Lang>("pl");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage first (instant), then sync from server
    const stored = localStorage.getItem("visli_lang") as Lang | null;
    if (stored === "pl" || stored === "en") {
      setLangState(stored);
    }

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.language === "en" || d.user?.language === "pl") {
          setLangState(d.user.language);
          localStorage.setItem("visli_lang", d.user.language);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setLang = useCallback(async (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("visli_lang", newLang);
    try {
      await fetch("/api/auth/language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: newLang }),
      });
    } catch {
      // Non-critical — already saved to localStorage
    }
  }, []);

  const translate = useCallback(
    (key: string, vars?: Record<string, string>) => t(lang, key, vars),
    [lang]
  );

  return { t: translate, lang, setLang, loading };
}
