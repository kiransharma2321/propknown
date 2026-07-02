"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency";

interface CurrencyCtx {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
}

const CurrencyContext = createContext<CurrencyCtx>({ currency: "INR", setCurrency: () => {} });

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("INR");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pk_currency") as CurrencyCode | null;
      if (saved && CURRENCIES.some(c => c.code === saved)) setCurrencyState(saved);
    } catch { /* noop */ }
  }, []);

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    try { localStorage.setItem("pk_currency", c); } catch { /* noop */ }
  };

  return <CurrencyContext.Provider value={{ currency, setCurrency }}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() { return useContext(CurrencyContext); }

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const current = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-zinc-600 text-zinc-300 hover:border-yellow-500 hover:text-white transition-all bg-zinc-900/60 backdrop-blur-sm"
        aria-label="Change currency">
        <span>{current.flag}</span>
        <span className="font-semibold">{current.code}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden w-44">
            {CURRENCIES.map(c => (
              <button key={c.code}
                onClick={() => { setCurrency(c.code); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs hover:bg-zinc-800 transition-colors ${currency === c.code ? "text-yellow-400 font-semibold" : "text-zinc-300"}`}>
                <span>{c.flag}</span>
                <span className="font-semibold">{c.code}</span>
                <span className="text-zinc-500 ml-auto">{c.symbol}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
