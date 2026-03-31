"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Lang, t as translate } from "@/lib/i18n";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string>) => string;
}

const LangContext = createContext<LangCtx>({
  lang: "pl",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pl");

  useEffect(() => {
    const saved = localStorage.getItem("visli_lang");
    if (saved === "en" || saved === "pl") setLangState(saved);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("visli_lang", l);
    fetch("/api/auth/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: l }) }).catch(() => {});
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string>) => translate(lang, key, vars),
    [lang]
  );

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LangContext);
}

export function LanguageSwitch() {
  const { lang, setLang } = useTranslation();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
      <button
        onClick={() => setLang("pl")}
        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${lang === "pl" ? "bg-[#3b5eee]/20 text-[#5f83f4]" : "text-white/30 hover:text-white/50"}`}
      >
        PL
      </button>
      <button
        onClick={() => setLang("en")}
        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${lang === "en" ? "bg-[#3b5eee]/20 text-[#5f83f4]" : "text-white/30 hover:text-white/50"}`}
      >
        EN
      </button>
    </div>
  );
}
