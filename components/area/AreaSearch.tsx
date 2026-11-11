"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Building2, MapPin, Loader2, ExternalLink } from "lucide-react";

// /area-prices search: any city, area or project worldwide. A place with a sourced price on
// record opens its area page; otherwise we run a live check (the same engine, free-check limits
// and quota protection as AI Intel), show it with its confidence, and it is saved -- the area
// then appears in the guide list once it has a sourced price.
interface Place { area: string; city: string; country: string; label: string; href: string | null }
interface Project { name: string; area: string }
interface Result { available: boolean; currentPricePerSqft?: number; priceRangeMin?: number; priceRangeMax?: number; currencySymbol?: string; pricePerSqftUnit?: string; confidence?: { level?: string; reason?: string }; sourceUrls?: string[]; fetchedAt?: string; cached?: boolean; message?: string; error?: string }

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

export default function AreaSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Place | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 3 || picked?.label === q) { setPlaces([]); setProjects([]); return; }
    timer.current = setTimeout(async () => {
      const j = await fetch(`/api/places/suggest?q=${encodeURIComponent(q.trim())}`).then((r) => r.json()).catch(() => null);
      setPlaces(j?.places ?? []); setProjects(j?.projects ?? []); setOpen(true);
    }, 450);
  }, [q, picked]);

  const choosePlace = async (p: Place) => {
    setPicked(p); setQ(p.label); setOpen(false); setResult(null);
    if (p.href) { router.push(p.href); return; }
    setBusy(true);
    const location = [p.area, p.city || p.country].filter(Boolean).join(", ");
    const r = await fetch("/api/market-intel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location, propertyType: "apartment", countUsage: true }) }).catch(() => null);
    const j: Result = r ? await r.json().catch(() => ({ available: false })) : { available: false };
    setResult(r?.status === 403 ? { available: false, error: "usage_limit" } : j);
    setBusy(false);
  };
  const chooseProject = (p: Project) => router.push(`/price-check?location=${encodeURIComponent(p.area)}&project=${encodeURIComponent(p.name)}#project`);

  const sources = (result?.sourceUrls ?? []).map(host).filter((v, i, a) => a.indexOf(v) === i);
  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-2xl border-2 border-[#D6A63E]/60 bg-white px-4 py-3 shadow-sm focus-within:border-[#D6A63E]">
        <Search size={20} className="text-[#7A5C1A] shrink-0" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setPicked(null); }} onFocus={() => places.length && setOpen(true)}
          placeholder="Search any city, area or project worldwide" aria-label="Search any city, area or project worldwide"
          className="w-full text-base sm:text-lg outline-none bg-transparent" autoComplete="off" />
        {busy && <Loader2 size={18} className="animate-spin text-gray-500" />}
      </div>
      {open && (places.length > 0 || projects.length > 0) && (
        <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-auto">
          {places.map((p) => <li key={p.label}><button type="button" onClick={() => choosePlace(p)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"><MapPin size={14} className="text-gray-500" />{p.label}{p.href && <span className="ml-auto text-[11px] text-[#7A5C1A]">price guide</span>}</button></li>)}
          {projects.map((p) => <li key={`${p.name}|${p.area}`}><button type="button" onClick={() => chooseProject(p)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"><Building2 size={14} className="text-gray-500" />{p.name} <span className="text-gray-500">· {p.area} · project</span></button></li>)}
        </ul>
      )}
      <p className="text-[11px] text-gray-500 mt-1">Place search © OpenStreetMap contributors (via Photon).</p>

      {picked && !picked.href && (busy || result) && (
        <div className="card-dark p-5 mt-4">
          {busy ? <p className="text-sm text-gray-600">Checking {picked.area} now…</p>
            : result?.error === "usage_limit" ? <p className="text-sm text-gray-700">You&apos;ve used today&apos;s free live checks. <Link href="/account/login?next=/area-prices" className="underline">Log in</Link> for more, or try a city we already cover.</p>
            : result?.available && result.currentPricePerSqft ? (
              <div className="text-sm space-y-1">
                {!result.cached && <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">We&apos;re checking this area. Here&apos;s a live estimate.</p>}
                <p className="font-semibold text-gray-900">{picked.area}{picked.city ? `, ${picked.city}` : ""}: {result.currencySymbol ?? ""}{result.currentPricePerSqft.toLocaleString("en-IN")}/{result.pricePerSqftUnit === "sqm" ? "sq.m" : "sq.ft"} <span className="font-normal text-gray-500">(apartments, asking)</span></p>
                {result.priceRangeMin && result.priceRangeMax && <p className="text-gray-600">Range {result.currencySymbol ?? ""}{result.priceRangeMin.toLocaleString("en-IN")}–{result.priceRangeMax.toLocaleString("en-IN")}</p>}
                <p className="text-gray-600">{result.confidence?.level ?? "—"} confidence · {sources.length} website{sources.length === 1 ? "" : "s"}{result.fetchedAt ? ` · captured ${new Date(result.fetchedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}</p>
                {sources.length > 0 && <p className="text-[11px] text-gray-500">Sources: {(result.sourceUrls ?? []).slice(0, 5).map((u, i) => <span key={u}>{i > 0 && " · "}<a href={u} target="_blank" rel="noopener noreferrer nofollow" className="underline inline-flex items-center gap-0.5">{host(u)}<ExternalLink size={9} /></a></span>)}</p>}
                <p className="text-[11px] text-gray-500">AI estimate from live web sources, indicative only. Verify before you decide.</p>
              </div>
            ) : <p className="text-sm text-gray-700">{result?.message ?? "We couldn't find enough sourced data for this area yet. We never guess a price."}</p>}
        </div>
      )}
    </div>
  );
}
