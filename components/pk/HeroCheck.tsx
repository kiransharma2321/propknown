"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Building2, Receipt, ArrowRight, ShieldCheck } from "lucide-react";
import { PK } from "./tokens";

// Hero check card: Area / Project / My quote. Inputs hand off to the real tools; until the
// visitor checks something, a REAL cached example is shown (with its captured date).

export interface HeroExampleData {
  area: { name: string; price: number; capturedAt: string | null; confidence: string | null } | null;
  project: { name: string; area: string; min: number; max: number; median: number; sources: number; capturedAt: string; verdict: string | null; pct: number | null; confidence: string | null } | null;
}

type Tab = "area" | "project" | "quote";
const day = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

export default function HeroCheck({ example }: { example: HeroExampleData }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("project");
  const [area, setArea] = useState("");
  const [project, setProject] = useState("");
  const [quote, setQuote] = useState("");

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "area") router.push(`/ai-intelligence?area=${encodeURIComponent(area)}&city=Hyderabad`);
    else router.push(`/price-check?location=${encodeURIComponent(area)}${project ? `&project=${encodeURIComponent(project)}` : ""}${quote ? `&quote=${encodeURIComponent(quote)}` : ""}#project`);
  };

  const field = "w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 text-sm text-white placeholder-white/45 outline-none focus:border-[#D6A63E] focus:ring-2 focus:ring-[#D6A63E]/30";
  const conf = (l: string | null) => l && (
    <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold" style={{ color: l === "High" ? "#4ade80" : l === "Medium" ? PK.gold : "#f87171", borderColor: "rgba(255,255,255,0.2)" }}>
      <ShieldCheck size={11} /> {l} confidence
    </span>
  );

  return (
    <form onSubmit={go} className="rounded-3xl border border-white/15 p-4 sm:p-6 shadow-2xl backdrop-blur-xl" style={{ background: "rgba(11,27,51,0.72)" }}>
      <div className="relative grid grid-cols-3 rounded-full bg-white/10 p-1 mb-4" role="tablist" aria-label="What do you want to check?">
        {([["area", "Area", MapPin], ["project", "Project", Building2], ["quote", "My quote", Receipt]] as const).map(([k, label, Icon]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition-colors ${tab === k ? "text-[#0B1B33]" : "text-white/70"}`}>
            {tab === k && <motion.span layoutId="hero-tab" className="absolute inset-0 -z-10 rounded-full" style={{ background: PK.gold }} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>
      <div className="grid gap-2">
        {tab !== "area" && <input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Project or apartment name" aria-label="Project or apartment name" className={field} />}
        <input value={area} onChange={(e) => setArea(e.target.value)} required placeholder="Area, e.g. Kokapet" aria-label="Area" className={field} />
        {tab === "quote" && <input value={quote} onChange={(e) => setQuote(e.target.value)} inputMode="numeric" placeholder="Quoted price (total ₹)" aria-label="Quoted price" className={field} />}
        <button type="submit" className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition hover:brightness-105" style={{ background: PK.gold, color: PK.navy }}>
          Check the fair price <ArrowRight size={16} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="mt-5 border-t border-white/10 pt-4 text-white">
          {tab === "area" && example.area ? (
            <>
              <p className="text-[11px] text-white/55">Example · {example.area.name} · apartment · captured {day(example.area.capturedAt)}</p>
              <p className="font-playfair text-3xl mt-1">₹{example.area.price.toLocaleString("en-IN")}<span className="text-sm text-white/50">/sq.ft</span></p>
              <div className="mt-2">{conf(example.area.confidence)}</div>
            </>
          ) : example.project ? (
            <>
              <p className="text-[11px] text-white/55">Example · {example.project.name} · {example.project.sources} listing sources · captured {day(example.project.capturedAt)}</p>
              <p className="font-playfair text-3xl mt-1">₹{example.project.min.toLocaleString("en-IN")}–{example.project.max.toLocaleString("en-IN")}<span className="text-sm text-white/50">/sq.ft asking</span></p>
              <div className="mt-2 flex flex-wrap gap-2">
                {example.project.verdict && example.project.pct != null && <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: `${PK.gold}2E`, color: PK.gold }}>{example.project.verdict} · {example.project.pct > 0 ? "+" : ""}{example.project.pct}% vs area</span>}
                {conf(example.project.confidence)}
              </div>
            </>
          ) : <p className="text-sm text-white/60">Live examples load from our price data.</p>}
          <p className="mt-3 text-[10px] text-white/45">AI estimate — indicative only, verify with RERA/a lawyer before deciding.</p>
        </motion.div>
      </AnimatePresence>
    </form>
  );
}
