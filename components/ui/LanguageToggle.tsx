"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { LANGUAGES, DICT, type LangCode, type DictKey } from "@/lib/i18n";

interface LangCtx {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: DictKey) => string;
}

const LangContext = createContext<LangCtx>({
  lang: "en",
  setLang: () => {},
  t: (key) => DICT[key]?.en ?? key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pk_lang") as LangCode | null;
      if (saved && LANGUAGES.some(l => l.code === saved)) setLangState(saved);
    } catch { /* noop */ }
  }, []);

  const setLang = (l: LangCode) => {
    setLangState(l);
    try { localStorage.setItem("pk_lang", l); } catch { /* noop */ }
  };

  const t = (key: DictKey) => DICT[key]?.[lang] ?? DICT[key]?.en ?? key;

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLanguage() { return useContext(LangContext); }

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-zinc-600 text-zinc-300 hover:border-yellow-500 hover:text-white transition-all bg-zinc-900/60 backdrop-blur-sm"
        aria-label="Change language">
        <span>{current.flag}</span>
        <span className="font-semibold">{current.label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden w-40">
            {LANGUAGES.map(l => (
              <button key={l.code}
                onClick={() => { setLang(l.code); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs hover:bg-zinc-800 transition-colors ${lang === l.code ? "text-yellow-400 font-semibold" : "text-zinc-300"}`}>
                <span>{l.flag}</span>
                <span className="font-semibold">{l.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
