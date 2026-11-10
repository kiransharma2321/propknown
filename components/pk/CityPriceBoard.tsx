"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { PK } from "./tokens";

// Homepage price board with a city switcher. Every bar is a real, sourced, dated apartment price
// from the cache; areas without one are not shown. Bars are scaled from zero to the highest price
// in that city, and every bar carries its own label (the label sits above the bar track, so the
// tallest bar is never cut off).

export interface BoardRow { area: string; href: string; price: number; capturedAt: string | null; confidence: string | null }
export interface CityBoard { slug: string; label: string; symbol: string; unit: string; rows: BoardRow[]; checkHref: string }

const day = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "");
const confColor = (l: string | null) => (l === "High" ? "#4ade80" : l === "Medium" ? PK.gold : "#f87171");
const compact = (sym: string, n: number) => `${sym}${n >= 1000 ? `${(n / 1000).toFixed(1)}k` : Math.round(n)}`;
const full = (sym: string, n: number) => `${sym}${Math.round(n).toLocaleString("en-IN")}`;

export default function CityPriceBoard({ boards }: { boards: CityBoard[] }) {
  const [active, setActive] = useState(boards.find((b) => b.rows.length)?.slug ?? boards[0]?.slug);
  const b = boards.find((x) => x.slug === active) ?? boards[0];
  if (!b) return null;
  const max = Math.max(1, ...b.rows.map((r) => r.price));

  return (
    <div data-reveal className="rounded-3xl border border-white/10 p-5 sm:p-7" style={{ background: `linear-gradient(180deg, ${PK.navySoft}, ${PK.navy})` }}>
      <div role="tablist" aria-label="City" className="flex flex-wrap gap-1.5 mb-5">
        {boards.map((c) => (
          <button key={c.slug} type="button" role="tab" aria-selected={c.slug === b.slug} onClick={() => setActive(c.slug)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${c.slug === b.slug ? "text-[#0B1B33]" : "text-white/75 hover:text-white border border-white/15"}`}
            style={c.slug === b.slug ? { background: PK.gold } : undefined}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between mb-4 text-xs">
        <span className="tracking-[0.3em] uppercase" style={{ color: PK.gold }}>{b.label} price board</span>
        <span className="text-white/60">{b.symbol.trim() || "₹"}/{b.unit} · apartments · asking</span>
      </div>

      {b.rows.length === 0 ? (
        <div className="h-56 sm:h-64 flex flex-col items-center justify-center text-center gap-3">
          <p className="text-white/75 text-sm max-w-xs">No sourced {b.label} area prices on record yet. We only show prices with real, dated sources.</p>
          <Link href={b.checkHref} className="rounded-full px-4 py-2 text-xs font-semibold" style={{ background: PK.gold, color: PK.navy }}>Check any {b.label} area live</Link>
        </div>
      ) : (
        <>
          <ul className="flex items-stretch gap-2 sm:gap-4 h-56 sm:h-64">
            {b.rows.map((r, i) => (
              <li key={r.area} className="flex-1 min-w-0 max-w-[110px] mx-auto">
                <Link href={r.href} aria-label={`${r.area}: ${full(b.symbol, r.price)} per ${b.unit}`} className="group h-full flex flex-col items-center">
                  <span className="h-6 shrink-0 text-[11px] sm:text-sm font-semibold text-white tabular-nums whitespace-nowrap">
                    <span className="sm:hidden">{compact(b.symbol, r.price)}</span><span className="hidden sm:inline">{full(b.symbol, r.price)}</span>
                  </span>
                  <span className="flex-1 w-full flex items-end">
                    <span className="pk-bar block w-full rounded-t-xl group-hover:brightness-110"
                      style={{ height: `${Math.max(3, (r.price / max) * 100)}%`, transition: "transform .9s ease-out, height .5s ease", transitionDelay: `${i * 60}ms`, background: `linear-gradient(180deg, ${PK.gold}, ${PK.gold}55)` }} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <ul className="flex gap-2 sm:gap-4 mt-3">
            {b.rows.map((r) => (
              <li key={r.area} className="flex-1 min-w-0 max-w-[110px] mx-auto text-center">
                <p className="text-[10px] sm:text-xs text-white/85 truncate" title={r.area}>{r.area}</p>
                {r.confidence && <ShieldCheck size={11} className="mx-auto mt-1" style={{ color: confColor(r.confidence) }} aria-label={`${r.confidence} confidence`} />}
                <p className="text-[9px] text-white/60">{day(r.capturedAt)}</p>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-[10px] text-white/60 mt-4">Asking prices from live web sources (AI estimate). Tap an area for its sources and captured date. Shield colour = confidence.</p>
    </div>
  );
}
