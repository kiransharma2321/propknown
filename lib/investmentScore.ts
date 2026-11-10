// M4: PropKnown Investment Score (0-100). A transparent, rules-based weighted score -- NOT a
// machine-learning model and not a prediction. The method (factors, weights, formulas, data
// sources) is published at /investment-score/method and this file is the single source of it.
//
// Rules:
// - Only factors with real inputs count. Missing factors are left out and the remaining weights
//   are re-scaled; the score always says how many of the factors it is based on.
// - Fewer than MIN_FACTORS factors -> no score ("not enough data").
// - Inputs that are AI estimates from web search are labelled as such wherever they're shown.
// Pure functions only, so the same code runs on the server and in the browser.

export const SCORE_VERSION = "1.0 (Nov 2026)";
export const MIN_FACTORS = 3;

export type FactorKey = "value" | "momentum" | "yield" | "confidence" | "rera";

export const FACTORS: Record<FactorKey, { label: string; weight: number; how: string; source: string }> = {
  value: { label: "Price vs area", weight: 30, how: "100 if the price is at or below the area's typical low end, 0 if 30%+ above the typical price, linear in between. Projects or quoted prices only.", source: "Asking prices from live listing/price pages (sourced, dated)" },
  momentum: { label: "5-year price trend", weight: 20, how: "Yearly growth (CAGR) over the last 5 years: 0% or less = 0, 10% or more = 100, linear in between.", source: "AI estimate from web search (labelled)" },
  yield: { label: "Rental yield", weight: 20, how: "Gross yearly rent ÷ price: 2% or less = 0, 5% or more = 100, linear in between.", source: "AI estimate from web search (labelled)" },
  confidence: { label: "Data confidence", weight: 15, how: "High = 100, Medium = 60, Low = 20 (how many independent sources agree).", source: "Our confidence rule on the sourced price" },
  rera: { label: "RERA status", weight: 15, how: "Verified by PropKnown = 100, number stated by a source in the official format = 60, none found = 0. Projects and listings only.", source: "RERA portal / project sources" },
};

export interface ScoreInputs {
  price?: number | null;                 // the project's or quoted price per unit
  areaPrice?: number | null;             // area typical price per unit
  areaRangeMin?: number | null;
  history5yr?: { year: number; value: number }[] | null;
  rentalYieldPct?: number | null;
  confidence?: "High" | "Medium" | "Low" | string | null;
  rera?: "verified" | "stated" | "none" | null;   // null = not applicable (areas)
}

export interface ScoreResult {
  score: number | null;
  band: "Strong" | "Good" | "Fair" | "Weak" | null;
  used: { key: FactorKey; label: string; points: number; weight: number; detail: string }[];
  missing: { key: FactorKey; label: string; why: string }[];
  basedOn: string;
  version: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const lin = (x: number, lo: number, hi: number) => clamp(((x - lo) / (hi - lo)) * 100);

export function cagr(history: { year: number; value: number }[]): number | null {
  const h = [...history].filter((p) => p.value > 0).sort((a, b) => a.year - b.year);
  if (h.length < 2) return null;
  const years = h[h.length - 1].year - h[0].year;
  if (years < 1) return null;
  return (Math.pow(h[h.length - 1].value / h[0].value, 1 / years) - 1) * 100;
}

export function investmentScore(i: ScoreInputs): ScoreResult {
  const used: ScoreResult["used"] = [];
  const missing: ScoreResult["missing"] = [];
  const add = (key: FactorKey, points: number, detail: string) => used.push({ key, label: FACTORS[key].label, points: Math.round(points), weight: FACTORS[key].weight, detail });
  const skip = (key: FactorKey, why: string) => missing.push({ key, label: FACTORS[key].label, why });

  if (i.price && i.areaPrice) {
    const low = i.areaRangeMin && i.areaRangeMin < i.areaPrice ? i.areaRangeMin : i.areaPrice * 0.85;
    const pts = i.price <= low ? 100 : i.price >= i.areaPrice * 1.3 ? 0 : 100 - ((i.price - low) / (i.areaPrice * 1.3 - low)) * 100;
    add("value", pts, `${Math.round(((i.price - i.areaPrice) / i.areaPrice) * 100)}% vs area typical`);
  } else skip("value", i.price ? "No sourced area price to compare with" : "Only for a project or a quoted price");

  const g = i.history5yr ? cagr(i.history5yr) : null;
  if (g != null) add("momentum", lin(g, 0, 10), `${g.toFixed(1)}% a year (AI estimate)`);
  else skip("momentum", "No 5-year price history on record");

  if (i.rentalYieldPct != null && i.rentalYieldPct > 0) add("yield", lin(i.rentalYieldPct, 2, 5), `${i.rentalYieldPct}% gross (AI estimate)`);
  else skip("yield", "No rental yield on record");

  if (i.confidence === "High" || i.confidence === "Medium" || i.confidence === "Low") add("confidence", { High: 100, Medium: 60, Low: 20 }[i.confidence], `${i.confidence} confidence`);
  else skip("confidence", "No sourced price");

  if (i.rera === "verified") add("rera", 100, "Verified by PropKnown");
  else if (i.rera === "stated") add("rera", 60, "Stated by a source, not yet verified");
  else if (i.rera === "none") add("rera", 0, "No RERA number found");
  else skip("rera", "Applies to projects and listings, not areas");

  if (used.length < MIN_FACTORS) {
    return { score: null, band: null, used, missing, basedOn: `Not enough data: ${used.length} of 5 factors available (need ${MIN_FACTORS}).`, version: SCORE_VERSION };
  }
  const totalW = used.reduce((a, u) => a + u.weight, 0);
  const score = Math.round(used.reduce((a, u) => a + u.points * u.weight, 0) / totalW);
  const band = score >= 75 ? "Strong" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Weak";
  return { score, band, used, missing, basedOn: `Based on ${used.length} of 5 factors`, version: SCORE_VERSION };
}

// ROI / CAGR / rental-yield calculator (user's own numbers only).
export interface RoiInput { buyPrice: number; buyCosts?: number; sellPrice: number; sellCosts?: number; years: number; monthlyRent?: number; yearlyOwnerCosts?: number }
export function roi(i: RoiInput) {
  const invested = i.buyPrice + (i.buyCosts || 0);
  const proceeds = i.sellPrice - (i.sellCosts || 0);
  const rentTotal = (i.monthlyRent || 0) * 12 * i.years;
  const costsTotal = (i.yearlyOwnerCosts || 0) * i.years;
  const gain = proceeds - invested + rentTotal - costsTotal;
  const roiPct = invested > 0 ? (gain / invested) * 100 : 0;
  const capitalCagr = invested > 0 && proceeds > 0 && i.years > 0 ? (Math.pow(proceeds / invested, 1 / i.years) - 1) * 100 : 0;
  const grossYield = i.buyPrice > 0 ? ((i.monthlyRent || 0) * 12 / i.buyPrice) * 100 : 0;
  const netYield = invested > 0 ? (((i.monthlyRent || 0) * 12 - (i.yearlyOwnerCosts || 0)) / invested) * 100 : 0;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return { invested: Math.round(invested), gain: Math.round(gain), roiPct: r1(roiPct), capitalCagr: r1(capitalCagr), grossYield: r1(grossYield), netYield: r1(netYield) };
}
