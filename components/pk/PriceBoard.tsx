"use client";

import { useRef } from "react";
import Link from "next/link";
import { useInView, useReducedMotion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { PK } from "./tokens";

// "Hyderabad Price Board": one bar per area, height = price relative to the highest shown.
// Bars and numbers are rendered on the server at their final size (the old preview hid them
// until a client animation ran, which is why it could render blank); on scroll they grow from
// the baseline. Reduced motion -> static bars.

export interface BoardRow { area: string; href: string; price: number | null; capturedAt: string | null; confidence: string | null }

const day = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "");
const confColor = (l: string | null) => (l === "High" ? "#4ade80" : l === "Medium" ? PK.gold : "#f87171");

export default function PriceBoard({ rows, unit = "₹/sq.ft · apartments" }: { rows: BoardRow[]; unit?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  const max = Math.max(1, ...rows.map((r) => r.price ?? 0));
  const grown = reduce || inView;

  return (
    <div ref={ref} className="rounded-3xl border border-white/10 p-5 sm:p-7" style={{ background: `linear-gradient(180deg, ${PK.navySoft}, ${PK.navy})` }}>
      <div className="flex items-center justify-between mb-6 text-xs">
        <span className="tracking-[0.3em] uppercase" style={{ color: PK.gold }}>Hyderabad price board</span>
        <span className="text-white/50">{unit}</span>
      </div>
      <div className="flex items-end gap-2 sm:gap-4 h-56 sm:h-64" role="list">
        {rows.map((r, i) => {
          const h = r.price ? Math.max(8, Math.round((r.price / max) * 100)) : 4;
          return (
            <Link key={r.area} href={r.href} role="listitem" className="group flex-1 min-w-0 h-full flex flex-col justify-end items-center" aria-label={`${r.area}: ${r.price ? `₹${r.price.toLocaleString("en-IN")} per sq.ft` : "not enough data"}`}>
              <span className="text-[11px] sm:text-sm font-semibold text-white mb-1.5 tabular-nums">{r.price ? `₹${(r.price / 1000).toFixed(1)}k` : "—"}</span>
              <div className="w-full rounded-t-xl origin-bottom transition-transform duration-[900ms] ease-out group-hover:brightness-110"
                style={{ height: `${h}%`, transform: grown ? "scaleY(1)" : "scaleY(0.04)", transitionDelay: `${i * 70}ms`,
                  background: r.price ? `linear-gradient(180deg, ${PK.gold}, ${PK.gold}55)` : "rgba(255,255,255,0.08)" }} />
            </Link>
          );
        })}
      </div>
      <div className="flex gap-2 sm:gap-4 mt-3">
        {rows.map((r) => (
          <div key={r.area} className="flex-1 min-w-0 text-center">
            <p className="text-[10px] sm:text-xs text-white/80 truncate">{r.area}</p>
            {r.confidence && <ShieldCheck size={11} className="mx-auto mt-1" style={{ color: confColor(r.confidence) }} aria-label={`${r.confidence} confidence`} />}
            <p className="text-[9px] text-white/40">{day(r.capturedAt)}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-white/40 mt-4">AI estimates from live web sources; tap an area for its sources and captured date. Shield colour = confidence.</p>
    </div>
  );
}
