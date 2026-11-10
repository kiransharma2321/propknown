"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, X, ExternalLink } from "lucide-react";
import type { CompareResult } from "@/lib/compare";
import { FEATURES } from "@/lib/features";

// M3 compare tool. The list lives in the URL (?i=area|Kokapet, Hyderabad|apartment&i=...), so a
// comparison can be shared or saved.
const TYPES = [["apartment", "Apartment"], ["villa", "Villa"], ["plot", "Plot"], ["commercial", "Commercial"]] as const;
const day = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const money = (sym: string, n: number) => `${sym}${Math.round(n).toLocaleString("en-IN")}`;
const inr = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : `₹${(n / 1e5).toFixed(1)} L`);

export default function CompareClient() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const items = params.getAll("i").slice(0, 4);
  const [results, setResults] = useState<CompareResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState<"area" | "project">("area");
  const [location, setLocation] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("apartment");
  const key = items.join("||");

  useEffect(() => {
    if (!items.length) { setResults([]); return; }
    setLoading(true);
    fetch("/api/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) })
      .then((r) => r.json()).then((j) => setResults(j.results ?? [])).catch(() => setResults([])).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setItems = (next: string[]) => {
    const q = new URLSearchParams();
    next.forEach((i) => q.append("i", i));
    router.replace(`${pathname}${next.length ? `?${q.toString()}` : ""}`, { scroll: false });
  };
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim() || (kind === "project" && !name.trim()) || items.length >= 4) return;
    const clean = (s: string) => s.replace(/\|/g, " ").trim();
    setItems([...items, kind === "area" ? `area|${clean(location)}|${type}` : `project|${clean(name)}|${clean(location)}|${type}`]);
    setName("");
  };

  const inp = "input-dark text-sm py-2.5 px-3";
  const rows: { label: string; cell: (r: CompareResult) => React.ReactNode }[] = [
    { label: "Price", cell: (r) => r.price ? <><b>{money(r.price.symbol, r.price.value)}/{r.price.unit}</b><span className="block text-[11px] text-gray-500">{r.price.label}</span></> : r.priceText ?? <span className="text-gray-500">{r.missing ?? "—"}</span> },
    { label: "Range", cell: (r) => r.price?.min && r.price?.max ? `${money(r.price.symbol, r.price.min)}–${money(r.price.symbol, r.price.max)}` : "—" },
    { label: "Confidence", cell: (r) => r.confidence ?? "—" },
    { label: "Sources", cell: (r) => (r.sources ? `${r.sources} website${r.sources === 1 ? "" : "s"}` : "—") },
    { label: "Captured", cell: (r) => day(r.capturedAt) },
    { label: "RERA", cell: (r) => r.rera ? <>{r.rera.number}{r.rera.sourceUrl && <a href={r.rera.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="ml-1 inline-flex text-gray-500"><ExternalLink size={11} /></a>}<span className="block text-[11px] text-gray-500">{r.rera.note}</span></> : <span className="text-[12px] text-gray-500">{r.reraNote || "—"}</span> },
    { label: "Possession", cell: (r) => r.possession ?? "—" },
    { label: "Status", cell: (r) => r.status ?? "—" },
    ...(FEATURES.investmentScore ? [{ label: "Investment Score", cell: (r: CompareResult) => r.score ? <>{r.score.score != null ? <b>{r.score.score}/100 · {r.score.band}</b> : "Not enough data"}<span className="block text-[11px] text-gray-500">{r.score.basedOn}. <Link href="/investment-score#method" className="underline">Method</Link></span></> : "—" }] : []),
    { label: `True cost (1,200 sq.ft)`, cell: (r) => r.trueCost ? <><b>{inr(r.trueCost.total)}</b><span className="block text-[11px] text-gray-500">incl. stamp duty + registration {inr(r.trueCost.stampAndRegistration)}{r.trueCost.gst ? ` + GST ${inr(r.trueCost.gst)}` : ""}. {r.trueCost.gstNote}</span></> : <span className="text-[12px] text-gray-500">{r.trueCostNote || "—"}</span> },
  ];

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="card-dark p-4 sm:p-5 grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto_auto] items-end">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm" role="tablist" aria-label="What to add">
          {(["area", "project"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)} className={`px-3 py-2.5 ${kind === k ? "bg-[#0B1B33] text-white" : "bg-white text-gray-700"}`}>{k === "area" ? "Area" : "Project"}</button>
          ))}
        </div>
        {kind === "project" ? <input aria-label="Project name" placeholder="Project name, e.g. Kowsalya Manidweepam" value={name} onChange={(e) => setName(e.target.value)} className={inp} /> : <span className="hidden sm:block" />}
        <input aria-label="Area and city" placeholder="Area, City, e.g. Kokapet, Hyderabad" value={location} onChange={(e) => setLocation(e.target.value)} className={inp} />
        <select aria-label="Property type" value={type} onChange={(e) => setType(e.target.value)} className={inp}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <button type="submit" disabled={items.length >= 4} className="btn-primary text-sm py-2.5 px-4 justify-center disabled:opacity-50"><Plus size={15} /> Add</button>
      </form>
      {items.length >= 4 && <p className="text-xs text-gray-500">You can compare up to 4 at a time.</p>}

      {!items.length ? (
        <p className="text-gray-500 text-sm">Add two or more areas or projects to see them side by side. Example: <button className="underline text-[#7A5C1A]" onClick={() => setItems(["area|Kokapet, Hyderabad|apartment", "area|Gachibowli, Hyderabad|apartment", "project|Kowsalya Manidweepam|Bachupally|apartment"])}>Kokapet vs Gachibowli vs Kowsalya Manidweepam</button></p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-3 w-40 text-gray-500 font-medium">{loading ? "Loading…" : "Compare"}</th>
                {results.map((r, idx) => (
                  <th key={r.key} className="p-3 align-top">
                    <div className="flex items-start justify-between gap-2">
                      <div><Link href={r.link} className="font-semibold text-gray-900 hover:underline">{r.title}</Link><p className="text-[11px] font-normal text-gray-500">{r.subtitle}</p></div>
                      <button aria-label={`Remove ${r.title}`} onClick={() => setItems(items.filter((_, j) => j !== idx))} className="text-gray-400 hover:text-red-600"><X size={14} /></button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-gray-100 align-top">
                  <th scope="row" className="p-3 text-left text-gray-500 font-medium">{row.label}</th>
                  {results.map((r) => <td key={r.key} className="p-3">{row.cell(r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-gray-500">Prices are asking prices from public listings and price pages (AI estimate), not registered sale prices. True cost uses Telangana/Karnataka/Maharashtra/AP government rates for a 1,200 sq.ft home at the price shown; the government guidance value is not included. Verify everything before you pay a token.</p>
    </div>
  );
}
