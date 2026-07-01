"use client";

import { useState, useMemo } from "react";
import { Calculator, ChevronDown, ChevronUp, Info } from "lucide-react";

const GOLD = "#C9A24B";

const STATE_RATES: Record<string, { stamp: number; registration: number }> = {
  Telangana:          { stamp: 7.0,  registration: 0.5 },
  "Andhra Pradesh":   { stamp: 5.0,  registration: 0.5 },
  Karnataka:          { stamp: 5.6,  registration: 1.0 },
  Maharashtra:        { stamp: 6.0,  registration: 1.0 },
  Delhi:              { stamp: 6.0,  registration: 1.0 },
  "Tamil Nadu":       { stamp: 7.0,  registration: 1.0 },
  Gujarat:            { stamp: 4.9,  registration: 1.0 },
  Rajasthan:          { stamp: 6.0,  registration: 1.0 },
  "Uttar Pradesh":    { stamp: 7.0,  registration: 1.0 },
  Other:              { stamp: 6.0,  registration: 1.0 },
};

type PropStatus = "resale" | "affordable_uc" | "other_uc";

const GST_RATES: Record<PropStatus, number> = {
  resale:       0,
  affordable_uc: 1,
  other_uc:     5,
};

const GST_LABELS: Record<PropStatus, string> = {
  resale:        "Ready / Resale (0% GST)",
  affordable_uc: "Under-Construction, price ≤ ₹45L — Affordable (1% GST)",
  other_uc:      "Under-Construction, price > ₹45L (5% GST)",
};

function fmtINR(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function calcEMI(principal: number, annualRate: number, tenureYears: number) {
  if (!principal || !annualRate || !tenureYears) return { emi: 0, totalInterest: 0, totalPayment: 0 };
  const r = annualRate / 12 / 100;
  const n = tenureYears * 12;
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalPayment = emi * n;
  const totalInterest = totalPayment - principal;
  return { emi: Math.round(emi), totalInterest: Math.round(totalInterest), totalPayment: Math.round(totalPayment) };
}

interface Props {
  initialPrice?: number;
  compact?: boolean;
}

export default function CostCalculator({ initialPrice, compact = false }: Props) {
  const [expanded, setExpanded] = useState(!compact);

  // Core inputs
  const [priceStr, setPriceStr]     = useState(initialPrice ? String(Math.round(initialPrice)) : "");
  const [state, setState]           = useState("Telangana");
  const [propStatus, setPropStatus] = useState<PropStatus>("resale");

  // Editable rates (seed from state defaults)
  const defaultRates = STATE_RATES[state] ?? STATE_RATES.Other;
  const [stampRate, setStampRate]   = useState(defaultRates.stamp);
  const [regRate, setRegRate]       = useState(defaultRates.registration);

  // Fixed costs (editable)
  const [legalFee, setLegalFee]         = useState(25000);
  const [brokerage, setBrokerage]       = useState(0);   // % of price
  const [maintenance, setMaintenance]   = useState(50000);

  // EMI section
  const [showEMI, setShowEMI]     = useState(false);
  const [loanPct, setLoanPct]     = useState(80); // % of price as loan
  const [interest, setInterest]   = useState(8.5);
  const [tenure, setTenure]       = useState(20);

  const handleStateChange = (s: string) => {
    setState(s);
    const r = STATE_RATES[s] ?? STATE_RATES.Other;
    setStampRate(r.stamp);
    setRegRate(r.registration);
  };

  const price = parseFloat(priceStr) || 0;

  const breakdown = useMemo(() => {
    const gstRate   = GST_RATES[propStatus];
    const stampAmt  = (price * stampRate) / 100;
    const regAmt    = (price * regRate) / 100;
    const gstAmt    = (price * gstRate) / 100;
    const brokeAmt  = (price * brokerage) / 100;
    const total     = price + stampAmt + regAmt + gstAmt + legalFee + brokeAmt + maintenance;
    return { stampAmt, regAmt, gstAmt, gstRate, brokeAmt, total };
  }, [price, stampRate, regRate, propStatus, legalFee, brokerage, maintenance]);

  const loanAmt    = Math.round(price * loanPct / 100);
  const emiData    = useMemo(() => calcEMI(loanAmt, interest, tenure), [loanAmt, interest, tenure]);

  const Row = ({ label, value, sub, highlight, editable, editVal, onEdit }: {
    label: string; value: string; sub?: string; highlight?: boolean;
    editable?: boolean; editVal?: string; onEdit?: (v: string) => void;
  }) => (
    <div className={`flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0 ${highlight ? "bg-amber-50 -mx-4 px-4 rounded-lg" : ""}`}>
      <div>
        <span className={`text-sm ${highlight ? "font-bold text-gray-900" : "text-gray-600"}`}>{label}</span>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {editable && onEdit ? (
        <div className="flex items-center gap-1.5">
          <input
            type="number" value={editVal ?? "0"} onChange={e => onEdit(e.target.value)} min={0} step="0.1"
            className="w-16 text-right text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-yellow-400"
          />
          <span className="text-xs text-gray-400 w-4">%</span>
        </div>
      ) : (
        <span className={`text-sm font-semibold ${highlight ? "text-amber-700" : "text-gray-900"}`}>{value}</span>
      )}
    </div>
  );

  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-all hover:opacity-90"
        style={{ borderColor: "rgba(201,162,75,0.4)", color: GOLD }}
      >
        <span className="flex items-center gap-2"><Calculator size={15} /> True Cost Calculator</span>
        <ChevronDown size={14} />
      </button>
    );
  }

  return (
    <div className={`border border-gray-200 rounded-2xl overflow-hidden ${compact ? "shadow-sm" : "shadow-md"}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer"
        style={{ background: "linear-gradient(135deg, rgba(201,162,75,0.08), rgba(201,162,75,0.03))" }}
        onClick={() => compact && setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(201,162,75,0.12)" }}>
            <Calculator size={18} style={{ color: GOLD }} />
          </div>
          <div>
            <h3 className={`font-bold text-gray-900 ${compact ? "text-sm" : "text-base"}`}>True Cost Calculator</h3>
            <p className="text-[10px] text-gray-400">Full all-in cost to own this property</p>
          </div>
        </div>
        {compact && (
          <button className="text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-5 py-4 space-y-4">
          {/* Inputs */}
          <div className={`grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3"}`}>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Property Price (₹)</label>
              <input
                type="number" value={priceStr}
                onChange={e => setPriceStr(e.target.value)}
                placeholder="e.g. 8500000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-yellow-400"
              />
              {price > 0 && <p className="text-[10px] text-gray-400 mt-1">{fmtINR(price)}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">State</label>
              <select value={state} onChange={e => handleStateChange(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-yellow-400 bg-white">
                {Object.keys(STATE_RATES).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Property Status (for GST)</label>
              <select value={propStatus} onChange={e => setPropStatus(e.target.value as PropStatus)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-yellow-400 bg-white">
                {(Object.entries(GST_LABELS) as [PropStatus, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Breakdown */}
          {price > 0 && (
            <>
              <div className="border border-gray-100 rounded-xl p-4 space-y-0">
                <Row label="Base Price" value={fmtINR(price)} />
                <Row
                  label={`Stamp Duty (${stampRate}%)`}
                  value={fmtINR(breakdown.stampAmt)}
                  sub={`Editable — ${state} rate`}
                  editable editVal={String(stampRate)}
                  onEdit={v => setStampRate(parseFloat(v) || 0)}
                />
                <Row
                  label={`Registration Fee (${regRate}%)`}
                  value={fmtINR(breakdown.regAmt)}
                  editable editVal={String(regRate)}
                  onEdit={v => setRegRate(parseFloat(v) || 0)}
                />
                {breakdown.gstAmt > 0 && (
                  <Row
                    label={`GST (${breakdown.gstRate}%)`}
                    value={fmtINR(breakdown.gstAmt)}
                    sub="Under-construction only; on agreement value"
                  />
                )}
                {breakdown.gstAmt === 0 && propStatus === "resale" && (
                  <Row label="GST" value="₹0 (Resale — exempt)" sub="No GST on ready-to-move or resale" />
                )}
                <Row
                  label="Legal / Documentation"
                  value={fmtINR(legalFee)}
                  editable editVal={String(legalFee)}
                  onEdit={v => setLegalFee(parseFloat(v) || 0)}
                />
                <Row
                  label={`Brokerage (${brokerage}%)`}
                  value={fmtINR(breakdown.brokeAmt)}
                  sub="Edit rate; PropKnown: success-based only"
                  editable editVal={String(brokerage)}
                  onEdit={v => setBrokerage(parseFloat(v) || 0)}
                />
                <Row
                  label="Maintenance / Corpus Deposit"
                  value={fmtINR(maintenance)}
                  editable editVal={String(maintenance)}
                  onEdit={v => setMaintenance(parseFloat(v) || 0)}
                />
              </div>

              {/* Grand Total */}
              <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, rgba(201,162,75,0.12), rgba(201,162,75,0.05))", border: "1.5px solid rgba(201,162,75,0.35)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Grand Total — All-In Cost to Own</p>
                    <p className="text-2xl font-bold" style={{ color: GOLD, fontFamily: "var(--font-playfair,Georgia,serif)" }}>
                      {fmtINR(breakdown.total)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      +{fmtINR(breakdown.total - price)} over base price ({((breakdown.total / price - 1) * 100).toFixed(1)}% extra)
                    </p>
                  </div>
                </div>
              </div>

              {/* EMI Section */}
              <div>
                <button
                  onClick={() => setShowEMI(e => !e)}
                  className="flex items-center gap-2 text-sm font-semibold transition-colors hover:opacity-80"
                  style={{ color: GOLD }}
                >
                  {showEMI ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  {showEMI ? "Hide" : "Show"} Home Loan EMI Calculator
                </button>

                {showEMI && (
                  <div className="mt-3 border border-gray-100 rounded-xl p-4 space-y-3">
                    <div className={`grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3"}`}>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          Loan Amount ({loanPct}% of price)
                        </label>
                        <div className="flex items-center gap-2">
                          <input type="range" min={10} max={90} value={loanPct}
                            onChange={e => setLoanPct(Number(e.target.value))}
                            className="flex-1" />
                          <span className="text-sm font-semibold text-gray-700 w-10 text-right">{loanPct}%</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">= {fmtINR(loanAmt)}</p>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Interest Rate (%/yr)</label>
                        <input type="number" value={interest} onChange={e => setInterest(parseFloat(e.target.value) || 0)}
                          min={4} max={20} step={0.1}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-yellow-400" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Tenure (years)</label>
                        <input type="number" value={tenure} onChange={e => setTenure(parseInt(e.target.value) || 0)}
                          min={1} max={30}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-yellow-400" />
                      </div>
                    </div>
                    {emiData.emi > 0 && (
                      <div className="grid grid-cols-3 gap-3 pt-2">
                        {[
                          { label: "Monthly EMI", val: fmtINR(emiData.emi) },
                          { label: "Total Interest", val: fmtINR(emiData.totalInterest) },
                          { label: "Total Payment", val: fmtINR(emiData.totalPayment) },
                        ].map(({ label, val }) => (
                          <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-[10px] text-gray-400 mb-1">{label}</p>
                            <p className="text-sm font-bold text-gray-900">{val}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 text-[10px] text-gray-400 leading-relaxed bg-gray-50 rounded-xl p-3">
            <Info size={11} className="shrink-0 mt-0.5 text-gray-300" />
            <span>
              Estimates based on typical {state} rates (Jul 2025). Actual charges vary — verify with the Sub-Registrar&apos;s office and PropKnown before any transaction. GST exemptions apply to fully completed OC-received buildings. All rates are editable above.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
