import { getMarketPrice, unitLabel, type EngineResult } from "@/lib/engine";
import { findLocalities } from "@/lib/localities";
import { sourceDomains } from "@/lib/engine/confidence";
import { emi } from "@/lib/trueCost";

// Ask KnownAI 2.0: turns a plain-language question ("Kokapet vs Tellapur for ₹1 Cr 3BHK?")
// into a structured answer -- per-area prices from the engine, a side-by-side comparison and an
// affordability check. Every number is either from the engine (with its date, confidence and
// sources) or from the user's own question. Nothing is estimated here: an area with no engine
// data says so, and EMI uses the user's loan rate or a labelled 8/9/10% sensitivity table.

export interface AreaAnswer {
  name: string; city: string; available: boolean;
  price?: number; unit?: string; symbol?: string; rangeMin?: number; rangeMax?: number;
  confidence?: { level: string; reason: string }; fetchedAt?: string; sources?: string[];
  buyableSqft?: number; pagePath: string;
}

export interface KnownAIAnalysis {
  propertyType: string; bhk: number | null; budget: number | null; monthlyIncome: number | null; loanRate: number | null;
  areas: AreaAnswer[];
  emi: { rate: number; emi: number; pctOfIncome: number | null; labelled: "your rate" | "example rate" }[];
  loanAmount: number | null;
}

const ANALYSIS_INTENT = /\b(vs\.?|versus|or|compare|comparison|better|which|afford|budget|emi|loan|salary|income|crore|cr|lakh|lakhs|lac|₹|rs\.?)\b/i;

export function wantsAnalysis(text: string): boolean {
  return findLocalities(text).length >= 1 && ANALYSIS_INTENT.test(text);
}

function amountIn(text: string): number | null {
  const m = text.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lakhs|lac|l)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return /^c/i.test(m[2]) ? n * 1e7 : n * 1e5;
}

export function parseQuestion(text: string) {
  const t = text.toLowerCase();
  const propertyType = /\b(plot|plots|land|open plot|gaj)\b/.test(t) ? "plot" : /\bvilla/.test(t) ? "villa" : /\b(independent house)\b/.test(t) ? "house" : /\b(commercial|office|shop)\b/.test(t) ? "commercial" : "apartment";
  const bhk = Number(t.match(/(\d)\s*-?\s*bhk/)?.[1]) || null;

  // Income: "earn 2 lakh a month", "salary 30 LPA", "income ₹1.5L per month".
  let monthlyIncome: number | null = null;
  const lpa = t.match(/(\d+(?:\.\d+)?)\s*lpa\b/);
  const inc = t.match(/(?:income|salary|earn(?:ing)?s?|take[- ]home)[^.\d]{0,20}(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)\s*(lakh|lakhs|lac|l|k|thousand|crore|cr)?\s*(per month|a month|monthly|\/month|pm|per annum|a year|yearly|p\.?a\.?)?/);
  if (lpa) monthlyIncome = Math.round((Number(lpa[1]) * 1e5) / 12);
  else if (inc) {
    const unitMul = /^(lakh|lakhs|lac|l)$/.test(inc[2] ?? "") ? 1e5 : /^(k|thousand)$/.test(inc[2] ?? "") ? 1e3 : /^(crore|cr)$/.test(inc[2] ?? "") ? 1e7 : 1;
    const v = Number(inc[1]) * unitMul;
    monthlyIncome = /annum|year|p\.?a/.test(inc[3] ?? "") ? Math.round(v / 12) : Math.round(v);
    if (monthlyIncome < 1000) monthlyIncome = null; // "income 2" with no unit is not usable
  }

  // Budget: the first amount that isn't the income figure.
  const withoutIncome = inc ? t.replace(inc[0], " ") : lpa ? t.replace(lpa[0], " ") : t;
  const budget = amountIn(withoutIncome);
  const rateM = t.match(/(\d{1,2}(?:\.\d{1,2})?)\s*%\s*(?:interest|rate|p\.?a|home loan)?/);
  const loanRate = rateM && Number(rateM[1]) >= 5 && Number(rateM[1]) <= 18 ? Number(rateM[1]) : null;
  return { propertyType, bhk, monthlyIncome, budget, loanRate };
}

export async function analyseQuestion(text: string, timeoutMs = 6000): Promise<KnownAIAnalysis> {
  const q = parseQuestion(text);
  const locs = findLocalities(text, 3);
  const results = await Promise.all(locs.map((l) =>
    getMarketPrice({ location: `${l.name}, ${l.city}`, propertyType: q.propertyType, tool: "chat", timeoutMs })
      .catch(() => ({ available: false } as EngineResult))));

  const areas: AreaAnswer[] = locs.map((l, i) => {
    const d = results[i];
    const base = { name: l.name, city: l.city, pagePath: `/ai-intelligence?area=${encodeURIComponent(l.name)}&city=${encodeURIComponent(l.city)}` };
    if (!d.available || !d.currentPricePerSqft) return { ...base, available: false };
    const u = String(d.pricePerSqftUnit ?? "sqft");
    const sources = sourceDomains(d.sourceUrls);
    return {
      ...base, available: true, price: d.currentPricePerSqft, unit: unitLabel(u), symbol: String(d.currencySymbol ?? "₹"),
      rangeMin: d.priceRangeMin, rangeMax: d.priceRangeMax, fetchedAt: d.fetchedAt, sources,
      confidence: sources.length === 0 ? { level: "Low", reason: "Sources unavailable for this result." } : d.confidence,
      buyableSqft: q.budget && u === "sqft" ? Math.round(q.budget / d.currentPricePerSqft) : undefined,
    };
  });

  const loanAmount = q.budget ? Math.round(q.budget * 0.8) : null;
  const rates = q.loanRate ? [q.loanRate] : [8, 9, 10];
  const emiRows = loanAmount ? rates.map((rate) => {
    const e = emi(loanAmount, rate, 20);
    return { rate, emi: e, pctOfIncome: q.monthlyIncome ? Math.round((e / q.monthlyIncome) * 100) : null, labelled: (q.loanRate ? "your rate" : "example rate") as "your rate" | "example rate" };
  }) : [];

  return { ...q, areas, emi: emiRows, loanAmount };
}

// Facts block handed to the model so its prose can only restate these numbers.
export function analysisFacts(a: KnownAIAnalysis): string {
  const lines = a.areas.map((x) => x.available
    ? `${x.name}, ${x.city}: ${x.symbol}${x.price!.toLocaleString("en-IN")}/${x.unit} (range ${x.symbol}${x.rangeMin?.toLocaleString("en-IN")}–${x.symbol}${x.rangeMax?.toLocaleString("en-IN")}), ${x.confidence?.level ?? "unknown"} confidence, data from ${x.fetchedAt ? new Date(x.fetchedAt).toDateString() : "unknown date"}${x.buyableSqft ? `, budget buys about ${x.buyableSqft.toLocaleString("en-IN")} sq.ft` : ""}`
    : `${x.name}, ${x.city}: NOT ENOUGH DATA (no price available)`);
  const emiLine = a.emi.length ? `EMI on ${a.loanAmount!.toLocaleString("en-IN")} loan (80% of budget, 20 years): ${a.emi.map((e) => `${e.rate}% (${e.labelled}) = ₹${e.emi.toLocaleString("en-IN")}/month${e.pctOfIncome != null ? ` = ${e.pctOfIncome}% of stated income` : ""}`).join("; ")}` : "";
  return [
    `PROPKNOWN ENGINE FACTS (the ONLY numbers you may use):`,
    `Property type: ${a.propertyType}${a.bhk ? `, ${a.bhk}BHK` : ""}${a.budget ? `; budget ₹${a.budget.toLocaleString("en-IN")}` : ""}${a.monthlyIncome ? `; stated monthly income ₹${a.monthlyIncome.toLocaleString("en-IN")}` : ""}`,
    ...lines, emiLine,
  ].filter(Boolean).join("\n");
}
