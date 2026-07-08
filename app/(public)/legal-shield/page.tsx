"use client";

import { useState } from "react";
import { Shield, AlertTriangle, CheckCircle2, MessageCircle, Loader2, Info, ScanSearch, XCircle, HelpCircle, Clock, ExternalLink, Search } from "lucide-react";
import { COMPANY } from "@/lib/utils";
import { RERA_STATES } from "@/lib/reraStates";

const GOLD = "#C9A24B";

const PROPERTY_TYPES = ["Apartment", "Villa", "House", "Plot", "Commercial"];
const UNITS = [{ value: "sqft", label: "per sq.ft" }, { value: "sqyard", label: "per sq.yard" }];
const SOURCES = ["Online Portal", "Broker", "Direct Owner", "Newspaper", "Social Media / WhatsApp Forward", "Other"];

const RISK_STYLE: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  Low:    { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  icon: "✓" },
  Medium: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", icon: "!" },
  High:   { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    icon: "⚠" },
};

interface RedFlagResult {
  riskLevel: "Low" | "Medium" | "High";
  areaAvgPrice: number | null;
  areaAvgUnit: string | null;
  priceComparisonNote: string;
  redFlags: { flag: string; explanation: string }[];
  whatToVerifyNext: string[];
  educationalNote: string;
  summary: string;
}

interface ReraScanResult {
  status:  "verified" | "pending" | "found_public" | "flagged" | "not_found";
  message: string;
  propertyTitle?: string;
  propertyLocation?: string;
  // Present when status === "found_public" -- publicly indexed info, never a government
  // verification. Any field may be absent if the search didn't surface it.
  projectName?: string;
  builder?: string;
  location?: string;
  priceRange?: string;
  startDate?: string;
  // Echoed back for whichever state was selected, so the result card can link to the right portal.
  stateName?: string;
  stateAuthority?: string;
  statePortalUrl?: string;
}

const RERA_STATUS_STYLE: Record<string, { label: string; color: string; bg: string; border: string; Icon: typeof CheckCircle2 }> = {
  verified:     { label: "Verified",                      color: "#16a34a", bg: "bg-green-50",  border: "border-green-200",  Icon: CheckCircle2 },
  pending:      { label: "Verification Pending",           color: "#b45309", bg: "bg-amber-50",  border: "border-amber-200",  Icon: Clock        },
  found_public: { label: "Public Info Found",               color: "#2563eb", bg: "bg-blue-50",   border: "border-blue-200",   Icon: Search       },
  flagged:      { label: "Flagged",                         color: "#dc2626", bg: "bg-red-50",    border: "border-red-200",    Icon: XCircle      },
  not_found:    { label: "Not Found",                       color: "#6b7280", bg: "bg-gray-50",   border: "border-gray-200",   Icon: HelpCircle   },
};

export default function LegalShieldPage() {
  const [form, setForm] = useState({
    location: "", propertyType: "Apartment", unit: "sqft",
    askingPrice: "", reraNumber: "", listingSource: "Online Portal", sellerClaims: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RedFlagResult | null>(null);
  const [error, setError] = useState("");

  const [reraInput,   setReraInput]   = useState("");
  const [reraState,   setReraState]   = useState("TG");
  const [reraLoading, setReraLoading] = useState(false);
  const [reraResult,  setReraResult]  = useState<ReraScanResult | null>(null);
  const [reraError,   setReraError]   = useState("");

  const scanRera = async () => {
    if (!reraInput.trim()) { setReraError("Please enter a RERA number to scan."); return; }
    setReraLoading(true); setReraError(""); setReraResult(null);
    try {
      const res = await fetch("/api/rera-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reraNumber: reraInput.trim(), state: reraState }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        // Small delay so the "scanning" animation is visible even on a fast response
        await new Promise(r => setTimeout(r, 500));
        setReraResult(data);
      } else {
        setReraError(data.error || "Could not scan this number right now. Please try again.");
      }
    } catch {
      setReraError("Could not scan this number right now. Please try again.");
    } finally {
      setReraLoading(false);
    }
  };

  const check = async () => {
    if (!form.location.trim()) { setError("Please enter the property's location/area."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/legal-shield", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: form.location.trim(),
          propertyType: form.propertyType.toLowerCase(),
          unit: form.unit,
          askingPrice: form.askingPrice ? Number(form.askingPrice) : undefined,
          reraNumber: form.reraNumber.trim() || undefined,
          listingSource: form.listingSource,
          sellerClaims: form.sellerClaims.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError("Could not run the check right now. Please WhatsApp us on 97017 71333.");
        return;
      }
      setResult(data);
    } catch {
      setError("Could not run the check right now. Please WhatsApp us on 97017 71333.");
    } finally {
      setLoading(false);
    }
  };

  const inp = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-yellow-500 placeholder-gray-400";
  const sel = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-yellow-500 bg-white";
  const risk = result ? (RISK_STYLE[result.riskLevel] ?? RISK_STYLE.Medium) : null;

  const waMsg = encodeURIComponent(
    `Hi PropKnown, I ran a Legal Shield red-flag check on a property in ${form.location || "an area"} and would like professional verification.`
  );

  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 border text-xs tracking-widest px-4 py-2 rounded-full mb-4 uppercase font-semibold"
            style={{ borderColor: "rgba(201,162,75,0.4)", color: GOLD, background: "rgba(201,162,75,0.08)" }}>
            <Shield size={13} /> PropKnown Legal Shield
          </div>
          <h1 className="section-heading mb-3" style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
            Fraud & Red-Flag <span className="gold-text">Checker</span>
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Enter what you know about a listing and get an honest, plain-language check for common
            Indian real estate scam signals — powered by KnownAI.
          </p>
        </div>

        {/* RERA Instant Verification Scanner */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-10">
          <div className="flex items-center gap-2 mb-1">
            <ScanSearch size={16} style={{ color: GOLD }} />
            <h2 className="text-gray-900 font-bold text-base">RERA Instant Verification Scanner</h2>
          </div>
          <p className="text-gray-500 text-xs mb-4 leading-relaxed">
            Checks against PropKnown&apos;s own admin-verified property records first, then searches
            publicly available web results if we don&apos;t have it on file. Neither is a live government
            RERA portal lookup — always confirm on the official state portal linked below.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={reraState}
              onChange={e => { setReraState(e.target.value); setReraResult(null); setReraError(""); }}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-yellow-500 bg-white sm:w-48"
            >
              {RERA_STATES.map(s => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
            <input
              value={reraInput}
              onChange={e => { setReraInput(e.target.value); setReraResult(null); setReraError(""); }}
              onKeyDown={e => { if (e.key === "Enter") scanRera(); }}
              placeholder="e.g. P02400012345"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-yellow-500 placeholder-gray-400"
            />
            <button
              onClick={scanRera}
              disabled={reraLoading}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold text-black text-sm transition-all hover:opacity-90 disabled:opacity-60 whitespace-nowrap"
              style={{ background: GOLD }}
            >
              {reraLoading ? <><Loader2 size={15} className="animate-spin" /> Scanning…</> : <><ScanSearch size={15} /> Scan Number</>}
            </button>
          </div>

          {reraError && <p className="text-red-600 text-xs mt-3">{reraError}</p>}

          {reraResult && (() => {
            const rs = RERA_STATUS_STYLE[reraResult.status];
            const fields: { label: string; value?: string }[] = [
              { label: "Project",  value: reraResult.projectName },
              { label: "Builder",  value: reraResult.builder },
              { label: "Location", value: reraResult.location },
              { label: "Price",    value: reraResult.priceRange },
              { label: "Start date", value: reraResult.startDate },
            ].filter(f => f.value);
            return (
              <div className={`mt-4 border rounded-xl p-4 flex items-start gap-3 animate-fade-in ${rs.bg} ${rs.border}`}>
                <rs.Icon size={20} style={{ color: rs.color }} className="shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm mb-1" style={{ color: rs.color }}>{rs.label}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{reraResult.message}</p>
                  {fields.length > 0 && (
                    <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 bg-white/60 rounded-lg p-2.5">
                      {fields.map(f => (
                        <div key={f.label}>
                          <span className="text-[10px] text-gray-400 uppercase tracking-wide block">{f.label}</span>
                          <span className="text-xs text-gray-800 font-medium">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {reraResult.status !== "verified" && reraResult.statePortalUrl && (
                    <a href={reraResult.statePortalUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold mt-2 hover:underline" style={{ color: GOLD }}>
                      Search on {reraResult.stateAuthority ?? reraResult.stateName} <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm h-fit">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Location / Area *</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Kokapet, Hyderabad" className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Property Type</label>
                  <select value={form.propertyType} onChange={e => setForm(f => ({ ...f, propertyType: e.target.value }))} className={sel}>
                    {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Price Unit</label>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className={sel}>
                    {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Asking Price ({form.unit === "sqyard" ? "₹/sq.yard" : "₹/sq.ft"})</label>
                <input type="number" value={form.askingPrice} onChange={e => setForm(f => ({ ...f, askingPrice: e.target.value }))}
                  placeholder="e.g. 8500" className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">RERA Number (if provided)</label>
                <input value={form.reraNumber} onChange={e => setForm(f => ({ ...f, reraNumber: e.target.value }))}
                  placeholder="e.g. P02400012345" className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Listing Source</label>
                <select value={form.listingSource} onChange={e => setForm(f => ({ ...f, listingSource: e.target.value }))} className={sel}>
                  {SOURCES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Seller Claims / Notes (optional)</label>
                <textarea value={form.sellerClaims} onChange={e => setForm(f => ({ ...f, sellerClaims: e.target.value }))}
                  rows={3} placeholder="e.g. 'Owner says must sell today, cash only, no RERA needed for resale'"
                  className={`${inp} resize-none`} />
              </div>

              {error && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <button onClick={check} disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-black text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: GOLD }}>
                {loading ? <><Loader2 size={16} className="animate-spin" /> Checking…</> : <><Shield size={16} /> Check for Red Flags</>}
              </button>
            </div>
          </div>

          {/* Results */}
          <div>
            {!result && !loading && (
              <div className="border border-gray-200 rounded-2xl p-8 text-center text-gray-400 text-sm h-full flex items-center justify-center">
                Fill in the details and run a check to see your red-flag report here.
              </div>
            )}

            {result && risk && (
              <div className="space-y-4">
                <div className={`border rounded-2xl p-5 ${risk.bg} ${risk.border}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{risk.icon}</span>
                    <p className={`font-bold text-base ${risk.text}`}>{result.riskLevel} Concern</p>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{result.summary}</p>
                </div>

                {result.areaAvgPrice != null && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Area average: ₹{result.areaAvgPrice.toLocaleString("en-IN")} / {result.areaAvgUnit}</p>
                    <p className="text-sm text-gray-700">{result.priceComparisonNote}</p>
                  </div>
                )}

                {result.redFlags.length > 0 ? (
                  <div className="border border-gray-200 rounded-2xl p-5">
                    <p className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                      <AlertTriangle size={15} className="text-yellow-600" /> Signals to Check ({result.redFlags.length})
                    </p>
                    <div className="space-y-3">
                      {result.redFlags.map((f, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <AlertTriangle size={13} className="text-yellow-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-gray-800">{f.flag}</p>
                            {f.explanation && <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{f.explanation}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border border-green-200 bg-green-50 rounded-2xl p-5 flex items-start gap-2.5">
                    <CheckCircle2 size={15} className="text-green-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-green-800">No obvious red flags detected from the details provided — still verify independently before proceeding.</p>
                  </div>
                )}

                <div className="border border-gray-200 rounded-2xl p-5">
                  <p className="font-bold text-gray-900 text-sm mb-3">What to Verify Next</p>
                  <ul className="space-y-2">
                    {result.whatToVerifyNext.map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-gray-600">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-black shrink-0 mt-0.5" style={{ background: GOLD }}>{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-2.5">
                  <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 leading-relaxed">{result.educationalNote}</p>
                </div>

                <a href={`https://wa.me/${COMPANY.whatsapp}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90"
                  style={{ background: "#25D366" }}>
                  <MessageCircle size={16} /> Talk to Raghu for Professional Verification
                </a>

                <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                  This is an educational red-flag check, not legal advice; always verify with professionals and PropKnown.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
