"use client";

import { useMemo, useState } from "react";
import { Calculator, ExternalLink } from "lucide-react";
import {
  RATE_TABLE, STATES, GST_OPTIONS, GST_SOURCE, computeTrueCost, emi,
  type StateKey, type GstKey,
} from "@/lib/trueCost";

// True Cost Calculator: what a buyer actually pays on top of the base price. Government rates
// come from lib/trueCost.ts (each with its source and date); builder and bank charges are the
// buyer's own numbers -- we never pre-fill those with guesses.

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const lakhCr = (n: number) => n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L` : inr(n);
const num = (s: string) => Number(s.replace(/[^\d.]/g, "")) || 0;

export interface TrueCostCalculatorProps {
  defaultState?: StateKey;
  defaultCity?: string;
  basePrice?: number;
  guidanceValue?: number;
  compact?: boolean;
}

export default function TrueCostCalculator(p: TrueCostCalculatorProps) {
  const [state, setState] = useState<StateKey>(p.defaultState ?? "Telangana");
  const [city, setCity] = useState(p.defaultCity ?? "");
  const [base, setBase] = useState(p.basePrice ? String(Math.round(p.basePrice)) : "");
  const [gv, setGv] = useState(p.guidanceValue ? String(Math.round(p.guidanceValue)) : "");
  const [gst, setGst] = useState<GstKey>("under_construction");
  const [extra, setExtra] = useState({ parking: "", clubhouse: "", maintenanceDeposit: "", legalFees: "", otherCharges: "" });
  const [loan, setLoan] = useState({ pct: "80", rate: "", years: "20", fee: "" });

  const basePrice = num(base);
  const loanAmount = basePrice * Math.min(100, num(loan.pct)) / 100;
  const result = useMemo(() => computeTrueCost({
    state, city, basePrice, guidanceValue: num(gv), gst,
    parking: num(extra.parking), clubhouse: num(extra.clubhouse), maintenanceDeposit: num(extra.maintenanceDeposit),
    legalFees: num(extra.legalFees), otherCharges: num(extra.otherCharges),
    loanAmount, loanProcessingPct: num(loan.fee),
  }), [state, city, basePrice, gv, gst, extra, loanAmount, loan.fee]);
  const monthly = emi(loanAmount, num(loan.rate), num(loan.years));
  const r = RATE_TABLE[state];

  const inp = "input-dark text-sm py-2 px-3 w-full";
  const lbl = "block text-[11px] font-semibold text-gray-500 mb-1";
  const money = (key: keyof typeof extra, label: string) => (
    <div>
      <label className={lbl} htmlFor={`tc-${key}`}>{label}</label>
      <input id={`tc-${key}`} inputMode="numeric" value={extra[key]} onChange={(e) => setExtra({ ...extra, [key]: e.target.value })} placeholder="₹ from builder quote" className={inp} />
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1"><Calculator size={18} style={{ color: "var(--gold-text)" }} /><h2 className="heading-h3 !text-xl">True Cost Calculator</h2></div>
      <p className="text-gray-500 text-sm mb-5">What you actually pay beyond the base price. Stamp duty and registration are charged on the higher of the sale price and the government guidance value.</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={lbl} htmlFor="tc-state">State</label>
          <select id="tc-state" value={state} onChange={(e) => setState(e.target.value as StateKey)} className={inp}>
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div><label className={lbl} htmlFor="tc-city">City</label><input id="tc-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Hyderabad" className={inp} /></div>
        <div><label className={lbl} htmlFor="tc-base">Base price (₹) *</label><input id="tc-base" inputMode="numeric" value={base} onChange={(e) => setBase(e.target.value)} placeholder="e.g. 9500000" className={inp} /></div>
        <div><label className={lbl} htmlFor="tc-gv">Govt guidance value of this property (₹)</label><input id="tc-gv" inputMode="numeric" value={gv} onChange={(e) => setGv(e.target.value)} placeholder="from the registration portal" className={inp} /></div>
        <div className="sm:col-span-2">
          <label className={lbl} htmlFor="tc-gst">Construction status</label>
          <select id="tc-gst" value={gst} onChange={(e) => setGst(e.target.value as GstKey)} className={inp}>
            {(Object.keys(GST_OPTIONS) as GstKey[]).map((k) => <option key={k} value={k}>{GST_OPTIONS[k].label}</option>)}
          </select>
        </div>
        {!p.compact && <>
          {money("parking", "Car parking")}{money("clubhouse", "Clubhouse / amenities")}
          {money("maintenanceDeposit", "Maintenance deposit")}{money("legalFees", "Legal / documentation fees")}
          {money("otherCharges", "Other charges (PLC, floor rise…)")}
        </>}
        <div><label className={lbl} htmlFor="tc-lp">Home loan (% of price)</label><input id="tc-lp" inputMode="numeric" value={loan.pct} onChange={(e) => setLoan({ ...loan, pct: e.target.value })} className={inp} /></div>
        <div><label className={lbl} htmlFor="tc-lr">Loan interest rate (% p.a.)</label><input id="tc-lr" inputMode="decimal" value={loan.rate} onChange={(e) => setLoan({ ...loan, rate: e.target.value })} placeholder="from your bank's offer" className={inp} /></div>
        <div><label className={lbl} htmlFor="tc-ly">Tenure (years)</label><input id="tc-ly" inputMode="numeric" value={loan.years} onChange={(e) => setLoan({ ...loan, years: e.target.value })} className={inp} /></div>
        <div><label className={lbl} htmlFor="tc-lf">Loan processing fee (%)</label><input id="tc-lf" inputMode="decimal" value={loan.fee} onChange={(e) => setLoan({ ...loan, fee: e.target.value })} placeholder="from your bank" className={inp} /></div>
      </div>

      {basePrice > 0 && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <table className="w-full text-sm">
            <tbody>
              {result.lines.filter((l) => l.amount > 0 || l.label === "Base price").map((l) => (
                <tr key={l.label}><td className="py-1 text-gray-600">{l.label}{l.note && <span className="text-gray-400 text-xs"> · {l.note}</span>}</td><td className="py-1 text-right tabular-nums text-gray-900">{inr(l.amount)}</td></tr>
              ))}
              <tr className="border-t border-gray-200"><td className="pt-2 font-semibold">True cost</td><td className="pt-2 text-right font-bold tabular-nums" style={{ color: "var(--gold-text)" }}>{lakhCr(result.total)}</td></tr>
              <tr><td className="text-xs text-gray-400">Over base price</td><td className="text-right text-xs text-gray-500 tabular-nums">+{lakhCr(result.total - basePrice)} ({((result.total / basePrice - 1) * 100).toFixed(1)}%)</td></tr>
              {monthly > 0 && <tr><td className="pt-2 text-gray-600">EMI on {lakhCr(loanAmount)} loan</td><td className="pt-2 text-right tabular-nums font-semibold">{inr(monthly)}/month</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-[11px] text-gray-500 space-y-1">
        <p>{r.notes} Concessions (women buyers, family transfers) are not applied.</p>
        <p>
          Rates last checked {new Date(r.lastChecked).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} from{" "}
          {r.sources.map((s, i) => <span key={s.url}>{i > 0 && ", "}<a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.label}</a></span>)}
          {" "}and <a href={GST_SOURCE.url} target="_blank" rel="noopener noreferrer" className="underline">{GST_SOURCE.label}</a>.
          {" "}Confirm the exact figure on the <a href={r.officialCalculator.url} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">{r.officialCalculator.label} <ExternalLink size={9} /></a> before you pay.
        </p>
        <p>Estimate only, not legal or tax advice.</p>
      </div>
    </div>
  );
}
