// True cost of buying a home in India: base price + stamp duty + registration + GST + the
// builder/bank charges the buyer enters. Government rates live in RATE_TABLE below, each with
// the source it was taken from and the date it was last checked. Stamp duty and registration
// are charged on the HIGHER of the sale price and the government guidance (market) value.
//
// Rates are the standard urban residential sale-deed rates. Concessions (women buyers, family
// transfers, rural/gram-panchayat rates) are not applied -- the result says so.

export type StateKey = "Telangana" | "Andhra Pradesh" | "Karnataka" | "Maharashtra";

export interface StateRates {
  state: StateKey;
  /** Stamp duty % of the dutiable value. Karnataka is slab-based, see stampDutyPct(). */
  stampDutyPct: number;
  transferDutyPct: number;
  /** Extra % on top of stamp duty in some places (e.g. Maharashtra metro cess). */
  metroCessPct: number;
  metroCessCities: RegExp | null;
  registrationPct: number;
  registrationCap: number | null;   // ₹, null = no cap applied
  notes: string;
  sources: { label: string; url: string }[];
  officialCalculator: { label: string; url: string };
  lastChecked: string;              // ISO date the rates were last checked against the sources
}

export const RATE_TABLE: Record<StateKey, StateRates> = {
  Telangana: {
    state: "Telangana", stampDutyPct: 4, transferDutyPct: 1.5, metroCessPct: 0, metroCessCities: null,
    registrationPct: 0.5, registrationCap: null,
    notes: "Urban areas incl. Hyderabad: 4% stamp duty + 1.5% transfer duty + 0.5% registration (≈6%). Gram panchayat areas are charged differently. Some sources mention a registration-fee cap; it is not applied here.",
    sources: [
      { label: "Brigade Group — Stamp duty & registration charges in Hyderabad", url: "https://www.brigadegroup.com/blog/residential/stamp-duty-and-registration-charges-in-hyderabad-telangana" },
      { label: "HomeFirst — Stamp duty & registration charges, Telangana", url: "https://homefirstindia.com/blog/article/stamp-duty-registration-charges-telangana" },
    ],
    officialCalculator: { label: "IGRS Telangana", url: "https://registration.telangana.gov.in/" },
    lastChecked: "2026-11-09",
  },
  "Andhra Pradesh": {
    state: "Andhra Pradesh", stampDutyPct: 5, transferDutyPct: 1.5, metroCessPct: 0, metroCessCities: null,
    registrationPct: 1, registrationCap: null,
    notes: "5% stamp duty + 1.5% transfer duty + 1% registration (≈7.5%).",
    sources: [
      { label: "Godrej Properties — Stamp duty in Andhra Pradesh 2026", url: "https://www.godrejproperties.com/blog/stamp-duty-registration-charges-andhra-pradesh-2026" },
      { label: "HomeFirst — Stamp duty & registration charges, Andhra Pradesh", url: "https://homefirstindia.com/blog/article/stamp-duty-registration-charges-andhra-pradesh" },
    ],
    officialCalculator: { label: "IGRS Andhra Pradesh", url: "https://registration.ap.gov.in/" },
    lastChecked: "2026-11-09",
  },
  Karnataka: {
    state: "Karnataka", stampDutyPct: 5, transferDutyPct: 0, metroCessPct: 0, metroCessCities: null,
    registrationPct: 2, registrationCap: null,
    notes: "Stamp duty by value: 2% up to ₹20L, 3% ₹20–45L, 5% above ₹45L, plus cess (10% of duty) and urban surcharge (2% of duty). Registration fee 2% since Aug 2025.",
    sources: [
      { label: "SquareYards — Stamp duty & registration charges, state-wise 2026", url: "https://www.squareyards.com/blog/stamp-duty-and-registration-charges-guide" },
      { label: "KS&K — Karnataka doubles property registration fee (2025)", url: "https://ksandk.com/md/newsletter/karnataka-doubles-property-registration-fee-in-2025/" },
    ],
    officialCalculator: { label: "Kaveri Online Services", url: "https://kaveri.karnataka.gov.in/" },
    lastChecked: "2026-11-09",
  },
  Maharashtra: {
    state: "Maharashtra", stampDutyPct: 5, transferDutyPct: 0, metroCessPct: 1,
    metroCessCities: /mumbai|thane|navi mumbai|pune|pimpri|chinchwad|nagpur/i,
    registrationPct: 1, registrationCap: 30_000,
    notes: "5% stamp duty, +1% metro cess in Mumbai, Thane, Navi Mumbai, Pune and Nagpur; registration 1% capped at ₹30,000. Women buyers get a 1% concession (not applied).",
    sources: [
      { label: "Godrej Capital — Stamp duty & registration charges in Maharashtra 2026", url: "https://www.godrejcapital.com/media-blog/knowledge-centre/stamp-duty-and-registration-charges-in-maharashtra" },
      { label: "HomeFirst — Stamp duty & registration charges, Maharashtra", url: "https://homefirstindia.com/blog/article/stamp-duty-registration-charges-maharashtra" },
    ],
    officialCalculator: { label: "IGR Maharashtra", url: "https://igrmaharashtra.gov.in/" },
    lastChecked: "2026-11-09",
  },
};

export const STATES = Object.keys(RATE_TABLE) as StateKey[];

// GST on residential property (GST Council, effective 1 Apr 2019): 5% on under-construction
// homes, 1% on affordable housing (≤ ₹45L and ≤ 60/90 sq.m carpet), none on ready homes with
// an occupancy certificate or resale.
export const GST_OPTIONS = {
  ready: { label: "Ready to move (with OC) or resale — no GST", pct: 0 },
  under_construction: { label: "Under construction — 5% GST", pct: 5 },
  affordable_uc: { label: "Under construction, affordable housing (≤ ₹45L) — 1% GST", pct: 1 },
} as const;
export type GstKey = keyof typeof GST_OPTIONS;
export const GST_SOURCE = { label: "CBIC — GST rates on real estate (Council decision, 1 Apr 2019)", url: "https://cbic-gst.gov.in/" };

export function stateFromLocation(text: string): StateKey | null {
  const t = text.toLowerCase();
  if (/hyderabad|telangana|secunderabad|warangal|karimnagar|kokapet|gachibowli|medchal/.test(t)) return "Telangana";
  if (/andhra|vizag|visakhapatnam|vijayawada|guntur|tirupati|amaravati|nellore/.test(t)) return "Andhra Pradesh";
  if (/bangalore|bengaluru|karnataka|mysore|mysuru|mangalore|whitefield/.test(t)) return "Karnataka";
  if (/mumbai|pune|maharashtra|thane|nagpur|nashik|bandra/.test(t)) return "Maharashtra";
  return null;
}

export function stampDutyPct(r: StateRates, dutiable: number): number {
  if (r.state !== "Karnataka") return r.stampDutyPct;
  const slab = dutiable <= 2_000_000 ? 2 : dutiable <= 4_500_000 ? 3 : 5;
  return slab * (1 + 0.10 + 0.02); // + 10% cess and 2% urban surcharge on the duty
}

export interface TrueCostInput {
  state: StateKey;
  city?: string;
  basePrice: number;          // agreement / sale price, ₹
  guidanceValue?: number;     // govt guidance value of the property, ₹ (0/undefined = unknown)
  gst: GstKey;
  parking?: number; clubhouse?: number; maintenanceDeposit?: number; legalFees?: number; otherCharges?: number;
  loanAmount?: number; loanProcessingPct?: number;
}

export interface CostLine { label: string; amount: number; note?: string }

export function computeTrueCost(i: TrueCostInput): { lines: CostLine[]; total: number; dutiableValue: number; dutiableBasis: "sale price" | "guidance value" } {
  const r = RATE_TABLE[i.state];
  const base = Math.max(0, i.basePrice || 0);
  const gv = Math.max(0, i.guidanceValue || 0);
  const dutiableValue = Math.max(base, gv);
  const dutiableBasis = gv > base ? "guidance value" : "sale price";

  const sdPct = stampDutyPct(r, dutiableValue);
  const cess = r.metroCessCities && i.city && r.metroCessCities.test(i.city) ? r.metroCessPct : 0;
  let registration = dutiableValue * r.registrationPct / 100;
  if (r.registrationCap) registration = Math.min(registration, r.registrationCap);
  const gst = base * GST_OPTIONS[i.gst].pct / 100;
  const loanFee = (i.loanAmount || 0) * (i.loanProcessingPct || 0) / 100;

  const lines: CostLine[] = [
    { label: "Base price", amount: base },
    { label: `Stamp duty (${+sdPct.toFixed(2)}%)`, amount: dutiableValue * sdPct / 100, note: `on the ${dutiableBasis}` },
    ...(r.transferDutyPct ? [{ label: `Transfer duty (${r.transferDutyPct}%)`, amount: dutiableValue * r.transferDutyPct / 100 }] : []),
    ...(cess ? [{ label: `Metro cess (${cess}%)`, amount: dutiableValue * cess / 100 }] : []),
    { label: `Registration (${r.registrationPct}%${r.registrationCap ? `, max ₹${r.registrationCap.toLocaleString("en-IN")}` : ""})`, amount: registration },
    { label: `GST (${GST_OPTIONS[i.gst].pct}%)`, amount: gst },
    { label: "Car parking", amount: i.parking || 0 },
    { label: "Clubhouse / amenities", amount: i.clubhouse || 0 },
    { label: "Maintenance deposit", amount: i.maintenanceDeposit || 0 },
    { label: "Legal / documentation fees", amount: i.legalFees || 0 },
    { label: "Loan processing fee", amount: loanFee },
    { label: "Other charges", amount: i.otherCharges || 0 },
  ].map((l) => ({ ...l, amount: Math.round(l.amount) }));

  return { lines, total: lines.reduce((a, l) => a + l.amount, 0), dutiableValue: Math.round(dutiableValue), dutiableBasis };
}

export function emi(principal: number, annualRatePct: number, years: number): number {
  if (!principal || !annualRatePct || !years) return 0;
  const r = annualRatePct / 12 / 100, n = years * 12;
  return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}
