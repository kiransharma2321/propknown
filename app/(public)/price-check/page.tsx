"use client";

import { useState } from "react";
import { Scale, Loader2, AlertCircle, Share2, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";
import UsageLimitPrompt from "@/components/ui/UsageLimitPrompt";

const PROPERTY_TYPES = [
  { value: "apartment",   label: "Apartment",               defaultUnit: "sqft"   },
  { value: "villa",       label: "Villa",                   defaultUnit: "sqft"   },
  { value: "house",       label: "Independent House",       defaultUnit: "sqft"   },
  { value: "commercial",  label: "Commercial / Office",     defaultUnit: "sqft"   },
  { value: "plot",        label: "Plot / Residential Land", defaultUnit: "sqyard" },
  { value: "agriculture", label: "Agriculture / Farm Land", defaultUnit: "acres"  },
];

const UNITS = [
  { value: "sqft",   label: "sq.ft"   },
  { value: "sqyard", label: "sq.yard" },
  { value: "acres",  label: "acre"    },
];

interface CheckResult {
  available:   boolean;
  confident:   boolean;
  verdict:     "fair" | "overpriced" | "underpriced" | "insufficient_data";
  pricePerUnit: number;
  unit:        string;
  realisticMin?: number;
  realisticMax?: number;
  currencySymbol?: string;
  locationName?: string;
  dataSourceLabel?: string;
  message:     string;
}

const VERDICT_STYLE: Record<string, { label: string; color: string; bg: string; border: string; Icon: typeof CheckCircle2 }> = {
  fair:       { label: "Fair Price",  color: "#16a34a", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.35)",  Icon: CheckCircle2 },
  overpriced: { label: "Overpriced",  color: "#dc2626", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.35)",  Icon: TrendingUp   },
  underpriced:{ label: "Underpriced", color: "#0891b2", bg: "rgba(6,182,212,0.08)",  border: "rgba(6,182,212,0.35)",  Icon: TrendingDown },
};

export default function PriceCheckPage() {
  const [location, setLocation] = useState("");
  const [propType, setPropType] = useState("apartment");
  const [unit,     setUnit]     = useState("sqft");
  const [areaSize, setAreaSize] = useState("");
  const [price,    setPrice]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [result,   setResult]   = useState<CheckResult | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number; remaining: number; loggedIn: boolean } | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const check = async () => {
    setError(""); setResult(null); setLimitReached(false);
    if (!location.trim()) { setError("Please enter the property's location."); return; }
    const areaNum  = parseFloat(areaSize);
    const priceNum = parseFloat(price);
    if (!areaNum || areaNum <= 0)   { setError("Please enter a valid area size."); return; }
    if (!priceNum || priceNum <= 0) { setError("Please enter a valid price."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/price-reality-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: priceNum, location: location.trim(), areaSize: areaNum, unit, propertyType: propType }),
      });
      const data = await res.json();
      if (res.status === 403 && data.error === "usage_limit") {
        setLimitReached(true);
        setUsage(data);
      } else if (res.ok && !data.error) {
        setResult(data);
        if (data.usage) setUsage(data.usage);
      } else {
        setError(data.error || "Could not check this price right now. Please try again.");
      }
    } catch {
      setError("Could not check this price right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const share = async () => {
    if (!result) return;
    const vs = VERDICT_STYLE[result.verdict];
    const text = `PropKnown Price Reality Check for ${result.locationName ?? location}:\n\n` +
      `${vs ? vs.label : "Insufficient Data"}\n${result.message}\n\nChecked free at propknown.com/price-check`;
    if (navigator.share) {
      try { await navigator.share({ title: "PropKnown Price Reality Check", text }); return; } catch { /* user cancelled, fall through to copy */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch { /* clipboard unavailable, nothing more we can do */ }
  };

  const vs = result && result.verdict !== "insufficient_data" ? VERDICT_STYLE[result.verdict] : null;

  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 text-gray-500 text-xs px-4 py-2 rounded-full mb-4">
            <Scale size={13} style={{ color: "#8a6a2e" }} /> Price Reality Check
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            Is That Price <span className="gold-text">Fair?</span>
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto text-base leading-relaxed">
            Paste in any property&apos;s price and details — from any source, not just PropKnown listings —
            and get an instant, honest verdict against current live market rates.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Location</label>
              <input
                type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Gachibowli, Hyderabad"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-yellow-500 placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Property Type</label>
              <select
                value={propType}
                onChange={e => {
                  const t = PROPERTY_TYPES.find(p => p.value === e.target.value);
                  setPropType(e.target.value);
                  if (t) setUnit(t.defaultUnit);
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-yellow-500 bg-white"
              >
                {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Unit</label>
              <select
                value={unit} onChange={e => setUnit(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-yellow-500 bg-white"
              >
                {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Area Size ({unit})</label>
              <input
                type="number" value={areaSize} onChange={e => setAreaSize(e.target.value)}
                placeholder="e.g. 1500"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-yellow-500 placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Asking Price (₹, total)</label>
              <input
                type="number" value={price} onChange={e => setPrice(e.target.value)}
                placeholder="e.g. 12000000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-yellow-500 placeholder-gray-400"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="shrink-0 mt-0.5" /> <span>{error}</span>
            </div>
          )}

          {!limitReached && (
            <button
              onClick={check}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-black font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: "#C9A24B" }}
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Checking against live market data…</> : <><Scale size={16} /> Check This Price</>}
            </button>
          )}
          {usage && !usage.loggedIn && !limitReached && (
            <p className="text-center text-gray-400 text-[11px] mt-2">
              {usage.used} of {usage.limit} free AI checks used
            </p>
          )}
        </div>

        {limitReached && (
          <div className="mt-6">
            <UsageLimitPrompt returnTo="/price-check" />
          </div>
        )}

        {result && (
          <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Your Price Reality Check Result</h2>
            {result.verdict === "insufficient_data" ? (
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="shrink-0 mt-0.5 text-gray-400" />
                <div>
                  <p className="text-gray-900 font-bold mb-1">Not enough data to give a confident verdict</p>
                  <p className="text-gray-500 text-sm leading-relaxed">{result.message}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full border font-bold text-sm"
                    style={{ background: vs?.bg, borderColor: vs?.border, color: vs?.color }}>
                    {vs && <vs.Icon size={16} />} {vs?.label}
                  </div>
                  {result.dataSourceLabel && (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                      style={{ background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.35)", color: "#16a34a" }}>
                      {result.dataSourceLabel}
                    </span>
                  )}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-5">{result.message}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={share}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:border-yellow-400 transition-all"
                  >
                    <Share2 size={15} /> {shareCopied ? "Copied to clipboard!" : "Share this result"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
