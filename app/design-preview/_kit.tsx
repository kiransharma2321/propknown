"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Landmark, Sparkles, Tag, FileDown, Building2, MapPin, Receipt } from "lucide-react";
import type { PreviewData } from "./_data";
import { NAVY, GOLD, GOLD_TEXT } from "./_consts";

// Shared preview building blocks. All numbers come from PreviewData (real cache rows).

const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

// "hero" content is never hidden: it renders visible on the server and only slides in, so the
// first paint (and crawlers) always see it. Other sections fade in as they scroll into view.
export function Reveal({ children, delay = 0, className = "", hero = false }: { children: React.ReactNode; delay?: number; className?: string; hero?: boolean }) {
  return (
    <motion.div className={className} initial={hero ? { opacity: 1, y: 12 } : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

export function ConfidencePill({ level, dark = false }: { level?: string | null; dark?: boolean }) {
  if (!level) return null;
  const c = level === "High" ? "#16a34a" : level === "Medium" ? (dark ? GOLD : GOLD_TEXT) : "#dc2626";
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold" style={{ color: c, borderColor: `${c}66`, background: `${c}14` }}>
      <ShieldCheck size={11} /> {level} confidence
    </span>
  );
}

// Interactive "check a price" card with intent tabs: Area / Project / My quote.
export function CheckCard({ data, dark = false }: { data: PreviewData; dark?: boolean }) {
  const [tab, setTab] = useState<"area" | "project" | "quote">("project");
  const kokapet = data.areas.find((a) => a.slug === "kokapet")?.price;
  const p = data.project;
  const surface = dark ? "bg-white/[0.06] border-white/15 text-white" : "bg-white border-gray-200 text-gray-900";
  const muted = dark ? "text-white/60" : "text-gray-500";
  const field = dark ? "bg-white/10 border-white/15 text-white placeholder-white/40" : "bg-gray-50 border-gray-200 placeholder-gray-400";
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 shadow-2xl ${surface}`}>
      <div className={`inline-flex rounded-full p-1 mb-4 ${dark ? "bg-white/10" : "bg-gray-100"}`} role="tablist">
        {([["area", "Area", MapPin], ["project", "Project", Building2], ["quote", "My quote", Receipt]] as const).map(([k, label, Icon]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${tab === k ? "text-[#0B1B33]" : muted}`}
            style={tab === k ? { background: GOLD } : undefined}>
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>
      <div className="grid gap-2">
        {tab !== "area" && <input readOnly value={tab === "project" ? "Prestige High Fields" : "Prestige High Fields · ₹1.3 Cr for 1,000 sq.ft"} className={`rounded-lg border px-3 py-2.5 text-sm ${field}`} aria-label="Project" />}
        <input readOnly value="Financial District, Hyderabad" className={`rounded-lg border px-3 py-2.5 text-sm ${field}`} aria-label="Area" />
      </div>
      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mt-4">
        {tab === "area" && kokapet ? (
          <div>
            <p className={`text-xs ${muted}`}>Kokapet · apartment · captured {day(kokapet.capturedAt)}</p>
            <p className="font-playfair text-3xl font-bold mt-1">₹{kokapet.price!.toLocaleString("en-IN")}<span className={`text-sm font-normal ${muted}`}>/sq.ft</span></p>
            <div className="mt-2"><ConfidencePill level={kokapet.confidence?.level} dark={dark} /></div>
          </div>
        ) : p?.price ? (
          <div>
            <p className={`text-xs ${muted}`}>{p.name} · {p.price.sources.length} sources · captured {day(p.price.capturedAt)}</p>
            <p className="font-playfair text-3xl font-bold mt-1">₹{p.price.min.toLocaleString("en-IN")}–{p.price.max.toLocaleString("en-IN")}<span className={`text-sm font-normal ${muted}`}>/sq.ft</span></p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {p.verdict && <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: `${GOLD}26`, color: dark ? GOLD : GOLD_TEXT }}>{p.verdict.label} · {p.verdict.pctVsLocality > 0 ? "+" : ""}{p.verdict.pctVsLocality}% vs area</span>}
              <ConfidencePill level={p.confidence?.level} dark={dark} />
            </div>
            {tab === "quote" && (() => {
              const pct = Math.round(((13000 - p.price.median) / p.price.median) * 1000) / 10;
              return <p className="text-sm mt-2">Your ₹13,000/sq.ft is <b>{Math.abs(pct)}% {pct >= 0 ? "above" : "below"}</b> this project&apos;s current listings.</p>;
            })()}
          </div>
        ) : <p className={`text-sm ${muted}`}>Example data not cached right now.</p>}
      </motion.div>
      <p className={`mt-3 text-[10px] ${muted}`}>Example from PropKnown&apos;s live data. AI estimate — indicative only, verify with RERA/a lawyer before deciding.</p>
    </div>
  );
}

// Govt guidance value · AI estimate · asking price, side by side.
export function ThreeWay({ data, dark = false }: { data: PreviewData; dark?: boolean }) {
  const fd = data.areas.find((a) => a.slug === "financial-district")?.price;
  const p = data.project;
  const muted = dark ? "text-white/60" : "text-gray-500";
  const cells = [
    { icon: Landmark, label: "Govt guidance value", value: "Not yet entered", note: "Copied by hand from IGRS, with its effective date", muted: true },
    { icon: Sparkles, label: "AI market estimate", value: fd?.price ? `₹${fd.price.toLocaleString("en-IN")}/sq.ft` : "—", note: fd?.capturedAt ? `Financial District · captured ${day(fd.capturedAt)}` : "" },
    { icon: Tag, label: "Asking price", value: p?.price ? `₹${p.price.median.toLocaleString("en-IN")}/sq.ft` : "—", note: p?.price ? `${p.name} · median of ${p.price.sources.length} listings` : "" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cells.map((c, i) => (
        <Reveal key={c.label} delay={i * 0.08}>
          <div className={`h-full rounded-2xl border p-4 ${dark ? "border-white/15 bg-white/[0.04]" : "border-gray-200 bg-white"}`}>
            <p className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider ${muted}`}><c.icon size={13} /> {c.label}</p>
            <p className={`font-playfair text-2xl font-bold mt-2 ${c.muted ? muted + " !text-base !font-semibold" : ""}`}>{c.value}</p>
            <p className={`text-[11px] mt-1 ${muted}`}>{c.note}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export function ReportCTA({ dark = false }: { dark?: boolean }) {
  return (
    <button type="button" className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-lg"
      style={{ background: GOLD, color: NAVY }}>
      <FileDown size={16} /> Download the Free Fair-Price Report{dark ? "" : " (PDF)"}
    </button>
  );
}

