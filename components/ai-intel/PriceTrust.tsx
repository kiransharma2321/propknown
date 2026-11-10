"use client";

import { useState } from "react";
import { ChevronDown, ShieldCheck, Landmark, Sparkles, Tag, ExternalLink } from "lucide-react";
import { sourceHost } from "@/lib/engine/sources";

// Trust pieces shown with every AI price: the confidence badge, the three-way price view
// (govt guidance value · AI market estimate · asking price) and the "How we got this number"
// sources panel. All figures arrive already converted for display via `fmt`.

export const AI_DISCLAIMER = "AI estimate — indicative only, verify with RERA/a lawyer before deciding.";

export interface Confidence { level: "High" | "Medium" | "Low"; reason: string }
export interface GuidanceValue {
  ratePerUnit: number; unit: string; currency: string; locality: string; state: string;
  sourceName: string; sourceUrl: string | null; effectiveDate: string;
}

const LEVEL_STYLE: Record<Confidence["level"], { bg: string; border: string; color: string }> = {
  High:   { bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.4)",  color: "#15803d" },
  Medium: { bg: "rgba(214,166,62,0.10)", border: "rgba(214,166,62,0.45)", color: "#7A5C1A" },
  Low:    { bg: "rgba(239,68,68,0.07)",  border: "rgba(239,68,68,0.35)", color: "#b91c1c" },
};

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function ConfidenceBadge({ confidence }: { confidence?: Confidence | null }) {
  if (!confidence) return null;
  const s = LEVEL_STYLE[confidence.level];
  return (
    <div className="inline-flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full text-xs font-semibold border"
        style={{ background: s.bg, borderColor: s.border, color: s.color }}>
        <ShieldCheck size={12} /> {confidence.level} confidence
      </span>
      <span className="text-[11px] text-gray-500 leading-snug">{confidence.reason}</span>
    </div>
  );
}

export function ThreeWayPrice({ guidance, aiPrice, asking, fmt, unitLabel }: {
  guidance?: GuidanceValue | null;
  aiPrice: number;
  asking?: number | null;
  fmt: (perUnit: number) => string;
  unitLabel: string;
}) {
  const cells = [
    {
      icon: <Landmark size={13} />, label: "Govt guidance value",
      value: guidance ? `${fmt(guidance.ratePerUnit)}/${unitLabel}` : "Not available for this area yet",
      note: guidance ? `${guidance.sourceName} · effective ${fmtDate(guidance.effectiveDate)}` : "Official rates are added by hand from the published source.",
      muted: !guidance,
    },
    { icon: <Sparkles size={13} />, label: "AI market estimate", value: `${fmt(aiPrice)}/${unitLabel}`, note: "From live web sources, see below.", muted: false },
    ...(asking != null && asking > 0
      ? [{ icon: <Tag size={13} />, label: "Asking price", value: `${fmt(asking)}/${unitLabel}`, note: "What this listing asks.", muted: false }]
      : []),
  ];
  return (
    <div className={`grid gap-2 mt-4 ${cells.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      {cells.map((c) => (
        <div key={c.label} className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">{c.icon}{c.label}</p>
          <p className={`font-semibold ${c.muted ? "text-gray-400 text-xs" : "text-gray-900 text-sm"}`}>{c.value}</p>
          <p className="text-[10px] text-gray-400 leading-snug mt-0.5">{c.note}</p>
        </div>
      ))}
    </div>
  );
}

export function HowWeGotThis({ sourceUrls, fetchedAt, dataSourceLabel, guidance, evidenceCount }: {
  sourceUrls?: string[];
  fetchedAt?: string;
  dataSourceLabel?: string;
  guidance?: GuidanceValue | null;
  evidenceCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const date = fetchedAt ? fmtDate(fetchedAt) : "today";
  const hosts = (sourceUrls ?? []).map((u) => ({ url: u, host: sourceHost(u) }))
    .filter((x): x is { url: string; host: string } => !!x.host);

  return (
    <div className="mt-4 border border-gray-200 rounded-xl">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900">
        How we got this number
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 text-xs text-gray-600 space-y-2">
          <p>
            {dataSourceLabel ?? "AI estimate based on live web search"}. An AI model read the pages below on {date} and
            extracted the typical rate for this area{evidenceCount ? `, cross-checked against ${evidenceCount} area-specific price figure${evidenceCount === 1 ? "" : "s"} parsed directly from them` : ""}.
            City-wide averages are not used as a local price.
          </p>
          {hosts.length > 0 ? (
            <ul className="space-y-1">
              {hosts.map((h) => (
                <li key={h.url} className="flex items-center justify-between gap-2">
                  <a href={h.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900 inline-flex items-center gap-1 break-all">
                    {h.host} <ExternalLink size={10} />
                  </a>
                  <span className="text-gray-400 shrink-0">read {date}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-red-700">Sources unavailable for this result, so treat it as Low confidence.</p>
          )}
          {guidance && (
            <p>
              Govt guidance value: {guidance.sourceName}
              {guidance.sourceUrl && <> (<a href={guidance.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">source</a>)</>}
              , effective {fmtDate(guidance.effectiveDate)}.
            </p>
          )}
          <p className="text-gray-400">The 5-year history and forecast are an illustrative AI projection, not records.</p>
        </div>
      )}
    </div>
  );
}
