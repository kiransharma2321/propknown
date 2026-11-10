"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { FEATURES } from "@/lib/features";
import { LANGS, LANG_COOKIE, isLang, translate, type Lang, type MsgKey } from "@/lib/i18n";

// M13: the visitor's language (English / Telugu / Hindi), remembered in a cookie. Applied in the
// browser so pages stay static (fast); English renders first. Off entirely unless the flag is on.
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: MsgKey) => string }>({ lang: "en", setLang: () => {}, t: (k) => translate("en", k) });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    if (!FEATURES.i18n) return;
    const c = document.cookie.split("; ").find((x) => x.startsWith(`${LANG_COOKIE}=`))?.split("=")[1];
    if (isLang(c) && c !== "en") setLangState(c);
  }, []);
  useEffect(() => { if (FEATURES.i18n) document.documentElement.lang = LANGS[lang].html; }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
  };
  const value = { lang: FEATURES.i18n ? lang : "en" as Lang, setLang, t: (k: MsgKey) => translate(FEATURES.i18n ? lang : "en", k) };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

// For server-rendered pages: <T k="board.h2" /> renders English on the server, then the
// visitor's language in the browser.
export function T({ k }: { k: MsgKey }) {
  return <>{useLang().t(k)}</>;
}

export function LangSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  if (!FEATURES.i18n) return null;
  return (
    <select aria-label="Language" value={lang} onChange={(e) => isLang(e.target.value) && setLang(e.target.value)}
      className={`rounded-full border border-white/30 bg-transparent text-white text-xs px-2 py-1.5 ${className}`}>
      {(Object.keys(LANGS) as Lang[]).map((l) => <option key={l} value={l} className="text-black">{LANGS[l].label}</option>)}
    </select>
  );
}
