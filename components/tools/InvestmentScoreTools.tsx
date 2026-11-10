"use client";

import { useState } from "react";
import { roi } from "@/lib/investmentScore";
import type { ScoreResult } from "@/lib/investmentScore";

// M4: area/project Investment Score lookup + ROI / CAGR / rental-yield calculator.
const inp = "input-dark text-sm py-2.5 px-3 w-full";
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function ScoreLookup() {
  const [location, setLocation] = useState("");
  const [project, setProject] = useState("");
  const [type, setType] = useState("apartment");
  const [res, setRes] = useState<ScoreResult | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) return;
    setBusy(true);
    const q = new URLSearchParams({ location, type, ...(project.trim() ? { project } : {}) });
    const r = await fetch(`/api/investment-score?${q}`).then((x) => x.json()).catch(() => null);
    setRes(r); setBusy(false);
  };

  return (
    <div className="card-dark p-5">
      <form onSubmit={go} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] items-end">
        <input aria-label="Area and city" placeholder="Area, City, e.g. Kokapet, Hyderabad" value={location} onChange={(e) => setLocation(e.target.value)} className={inp} />
        <input aria-label="Project name (optional)" placeholder="Project name (optional)" value={project} onChange={(e) => setProject(e.target.value)} className={inp} />
        <select aria-label="Property type" value={type} onChange={(e) => setType(e.target.value)} className={inp}>
          <option value="apartment">Apartment</option><option value="villa">Villa</option><option value="plot">Plot</option><option value="commercial">Commercial</option>
        </select>
        <button type="submit" disabled={busy} className="btn-primary text-sm py-2.5 px-4 justify-center">{busy ? "Scoring…" : "Get score"}</button>
      </form>
      {res && (
        <div className="mt-5">
          {res.score != null ? (
            <p className="font-playfair text-4xl text-gray-900">{res.score}<span className="text-lg text-gray-500">/100</span> <span className="text-base font-sans font-semibold text-[#7A5C1A]">{res.band}</span></p>
          ) : <p className="font-semibold text-gray-900">Not enough data to score this yet.</p>}
          <p className="text-xs text-gray-500 mt-1">{res.basedOn} · method v{res.version}. Rules-based, not a prediction.</p>
          <table className="w-full text-sm mt-4">
            <tbody>
              {res.used.map((u) => (
                <tr key={u.key} className="border-t border-gray-100"><td className="py-2 pr-3 text-gray-700">{u.label} <span className="text-gray-500 text-xs">(weight {u.weight})</span></td><td className="py-2 pr-3 text-gray-500 text-xs">{u.detail}</td><td className="py-2 text-right font-semibold">{u.points}</td></tr>
              ))}
              {res.missing.map((m) => (
                <tr key={m.key} className="border-t border-gray-100 text-gray-500"><td className="py-2 pr-3">{m.label}</td><td className="py-2 pr-3 text-xs" colSpan={2}>Not used: {m.why}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function RoiCalculator() {
  const [v, setV] = useState({ buyPrice: "", buyCosts: "", sellPrice: "", sellCosts: "", years: "5", monthlyRent: "", yearlyOwnerCosts: "" });
  const n = (s: string) => Number(s.replace(/[^\d.]/g, "")) || 0;
  const ready = n(v.buyPrice) > 0 && n(v.sellPrice) > 0 && n(v.years) > 0;
  const r = ready ? roi({ buyPrice: n(v.buyPrice), buyCosts: n(v.buyCosts), sellPrice: n(v.sellPrice), sellCosts: n(v.sellCosts), years: n(v.years), monthlyRent: n(v.monthlyRent), yearlyOwnerCosts: n(v.yearlyOwnerCosts) }) : null;
  const field = (k: keyof typeof v, label: string, hint?: string) => (
    <label className="block text-xs font-semibold text-gray-600">{label}{hint && <span className="font-normal text-gray-500"> {hint}</span>}
      <input inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} className={`${inp} mt-1`} />
    </label>
  );
  return (
    <div className="card-dark p-5 grid gap-6 lg:grid-cols-2">
      <div className="grid gap-3 sm:grid-cols-2">
        {field("buyPrice", "Purchase price (₹)")}
        {field("buyCosts", "Buying costs (₹)", "stamp duty, registration, GST")}
        {field("sellPrice", "Expected sale price (₹)", "your estimate")}
        {field("sellCosts", "Selling costs (₹)", "brokerage etc.")}
        {field("years", "Years held")}
        {field("monthlyRent", "Monthly rent (₹)", "if let out")}
        {field("yearlyOwnerCosts", "Yearly owner costs (₹)", "maintenance, tax")}
      </div>
      <div>
        {r ? (
          <dl className="grid grid-cols-2 gap-3">
            {[["Total invested", inr(r.invested)], ["Total gain", inr(r.gain)], ["ROI", `${r.roiPct}%`], ["Capital growth (CAGR)", `${r.capitalCagr}% a year`], ["Gross rental yield", `${r.grossYield}%`], ["Net rental yield", `${r.netYield}%`]].map(([k, val]) => (
              <div key={k} className="bg-gray-50 border border-gray-200 rounded-xl p-3"><dt className="text-[11px] text-gray-500 uppercase tracking-wider">{k}</dt><dd className="font-playfair text-xl text-gray-900">{val}</dd></div>
            ))}
          </dl>
        ) : <p className="text-sm text-gray-500">Enter a purchase price, an expected sale price and the years held.</p>}
        <p className="text-[11px] text-gray-500 mt-3">Uses only the numbers you enter. ROI includes rent and owner costs; CAGR is capital growth only. Not financial advice: PropKnown is not a licensed investment adviser.</p>
      </div>
    </div>
  );
}
