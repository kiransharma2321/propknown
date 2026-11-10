"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Loader2, ExternalLink } from "lucide-react";
import { ConfidenceBadge, AI_DISCLAIMER } from "@/components/ai-intel/PriceTrust";
import { sourceSiteCount, type ProjectResult } from "@/lib/projects/sites";
import WatchButton from "@/components/buyer/WatchButton";

// Optional "Project / apartment / venture name" check (Task K): autocomplete from our own records,
// then the project's facts and current asking price from real dated sources, compared with the
// locality and (if given) the visitor's quoted price. Not found -> area price + "Ask an expert".

interface Suggestion { name: string; builder: string | null; area: string; source: string }
type Result = ProjectResult & { quote: { pricePerSqft: number; pctVsProject: number } | null };

const day = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const FACT_LABEL: Record<string, string> = { reraNumber: "RERA no.", builder: "Builder", location: "Location", projectType: "Type", status: "Status", possession: "Possession" };

export default function ProjectCheck({ area, propertyType, quotedPricePerSqft, onProjectChange, initialName = "" }: {
  area: string; propertyType: string; quotedPricePerSqft?: number; onProjectChange?: (name: string) => void; initialName?: string;
}) {
  const [name, setName] = useState(initialName);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [picked, setPicked] = useState<Suggestion | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    onProjectChange?.(name);
    if (timer.current) clearTimeout(timer.current);
    if (name.trim().length < 2 || picked?.name === name) { setSuggestions([]); return; }
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/projects/suggest?q=${encodeURIComponent(name.trim())}`).then((x) => x.json()).catch(() => null);
      setSuggestions(r?.suggestions ?? []);
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // Several matches with the same name: the visitor must pick one.
  const sameName = suggestions.filter((s) => s.name.toLowerCase() === name.trim().toLowerCase());
  const mustPick = !picked && sameName.length > 1;

  const check = async () => {
    const where = picked?.area || area;
    if (!name.trim() || !where.trim()) { setError("Enter the project name and the area above."); return; }
    setState("loading"); setError(""); setResult(null);
    try {
      const res = await fetch("/api/projects/check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), area: where, propertyType, quotedPricePerSqft }),
      });
      const data = await res.json();
      if (!res.ok) { setState("error"); setError(data.error ?? "Couldn't check this project right now."); return; }
      setResult(data); setState("done");
    } catch { setState("error"); setError("Couldn't check this project right now."); }
  };

  const inp = "input-dark text-sm py-2.5 px-3 w-full";
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white">
      <label htmlFor="project-name" className="label-dark flex items-center gap-1.5"><Building2 size={13} /> Project / apartment / venture name (optional)</label>
      <div className="relative">
        <input id="project-name" value={name} onChange={(e) => { setName(e.target.value); setPicked(null); }} placeholder="e.g. Aparna Sarovar Grande" className={inp} autoComplete="off" />
        {suggestions.length > 0 && (
          <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {suggestions.map((s) => (
              <li key={`${s.name}|${s.area}`}>
                <button type="button" onClick={() => { setPicked(s); setName(s.name); setSuggestions([]); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                  <span className="font-medium text-gray-900">{s.name}</span>
                  <span className="text-gray-500"> · {s.builder ?? "Builder not on record"} · {s.area || "Area not on record"}</span>
                  <span className="block text-[10px] text-gray-400">{s.source}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {mustPick && <p className="text-xs text-amber-700 mt-1">Several projects share this name: pick the right one from the list.</p>}
      <button type="button" onClick={check} disabled={state === "loading" || mustPick || !name.trim()} className="btn-secondary text-sm mt-2 disabled:opacity-50">
        {state === "loading" ? <><Loader2 size={14} className="animate-spin" /> Checking project…</> : "Check this project's price"}
      </button>
      {error && <p className="text-sm text-red-700 mt-2">{error}</p>}

      {result && !result.found && (
        <div className="mt-3 text-sm bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
          <p className="font-semibold text-gray-900">We couldn&apos;t verify this project yet. Here&apos;s the area price instead.</p>
          {result.locality ? <p>{area}: about ₹{result.locality.price.toLocaleString("en-IN")}/sq.ft{result.locality.capturedAt ? ` (captured ${day(result.locality.capturedAt)})` : ""}.</p> : <p>No area price on record yet either.</p>}
          <ExpertForm project={name} area={area} />
        </div>
      )}

      {result?.found && (
        <div className="mt-3 text-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(result.facts).map(([k, f]) => f && (
              <p key={k}><span className="text-gray-400">{FACT_LABEL[k] ?? k}:</span> {f.value} <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-gray-400 underline text-[10px]">source, {day(f.capturedAt)}</a></p>
            ))}
            {!result.facts.reraNumber && <p className="text-gray-500"><span className="text-gray-400">RERA no.:</span> not found in a source, so we don&apos;t show one. Check it on the RERA portal.</p>}
          </div>
          {result.price ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
              <p className="font-semibold text-gray-900">Current asking price: {result.price.currency === "INR" ? "₹" : `${result.price.currency} `}{result.price.min.toLocaleString("en-IN")}–{result.price.max.toLocaleString("en-IN")}/sq.ft</p>
              <p className="text-xs text-gray-500">{sourceSiteCount(result.price)} source{sourceSiteCount(result.price) === 1 ? "" : "s"}, captured {day(result.price.capturedAt)}: {result.price.sources.map((s, i) => <span key={s.url}>{i > 0 && ", "}<a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="underline">{s.host}<ExternalLink size={9} className="inline" /></a></span>)}</p>
              {result.verdict && result.locality && (
                <p><b>{result.verdict.label}</b>: {result.verdict.pctVsLocality > 0 ? "+" : ""}{result.verdict.pctVsLocality}% vs {area}&apos;s typical ₹{result.locality.price.toLocaleString("en-IN")}/sq.ft{result.locality.capturedAt ? ` (captured ${day(result.locality.capturedAt)})` : ""}.</p>
              )}
              {result.quote && <p>Your quote ₹{result.quote.pricePerSqft.toLocaleString("en-IN")}/sq.ft is <b>{Math.abs(result.quote.pctVsProject)}% {result.quote.pctVsProject >= 0 ? "above" : "below"}</b> this project&apos;s current listings.</p>}
              <ConfidenceBadge confidence={result.confidence} />
            </div>
          ) : (
            <p className="text-gray-600">We found the project but no dated asking price for it yet.</p>
          )}
          <p className="text-[11px] text-gray-500">{AI_DISCLAIMER}</p>
          {result.price && <WatchButton kind="project" location={result.query.area} projectName={result.name} propertyType={propertyType} />}
          <ExpertForm project={name} area={area} />
        </div>
      )}
    </div>
  );
}

function ExpertForm({ project, area }: { project: string; area: string }) {
  const [n, setN] = useState(""); const [p, setP] = useState(""); const [s, setS] = useState<"idle" | "sending" | "done" | "error">("idle");
  if (s === "done") return <p className="text-green-700 text-sm">Thanks — an expert will call you about {project}.</p>;
  return (
    <form className="flex flex-wrap gap-2 items-center" onSubmit={async (e) => {
      e.preventDefault(); setS("sending");
      const r = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, phone: p.replace(/[^\d+]/g, ""), source: "Project check — ask an expert", message: `Project: ${project} (${area})` }) }).catch(() => null);
      setS(r?.ok ? "done" : "error");
    }}>
      <span className="text-xs font-semibold text-gray-700">Ask an expert:</span>
      <input required value={n} onChange={(e) => setN(e.target.value)} placeholder="Name" aria-label="Name" className="input-dark text-xs py-1.5 px-2 w-28" />
      <input required inputMode="tel" value={p} onChange={(e) => setP(e.target.value)} placeholder="Phone" aria-label="Phone" className="input-dark text-xs py-1.5 px-2 w-32" />
      <button type="submit" disabled={s === "sending"} className="btn-primary text-xs py-1.5">{s === "sending" ? "Sending…" : "Request a call"}</button>
      {s === "error" && <span className="text-xs text-red-700">Couldn&apos;t send — WhatsApp 70130 16003.</span>}
    </form>
  );
}
