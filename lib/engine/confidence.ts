// Confidence badge for an AI price: High / Medium / Low with a one-line reason, from three
// things we can actually measure -- how many independent sources the figure came from, how much
// they agree, and how old the data is. Computed on the way out of the engine (so a cached row
// gets less confident as it ages), never stored.

import { sourceHosts } from "@/lib/engine/sources";

export type ConfidenceLevel = "High" | "Medium" | "Low";
export interface Confidence { level: ConfidenceLevel; reason: string }

export interface ConfidenceInput {
  sourceUrls?: unknown;
  // Rate mentions parsed straight out of area-specific source text (lib/marketIntel).
  evidence?: { count?: number; min?: number; max?: number; median?: number } | null;
  currentPricePerSqft?: unknown;
  fetchedAt?: string | Date | null;
  stale?: boolean;
}

const DAY = 86_400_000;

// Real price-source hosts only (search tools, company databases and social sites dropped).
export const sourceDomains = sourceHosts;

export function computeConfidence(r: ConfidenceInput, now = Date.now()): Confidence {
  const sources = sourceDomains(r.sourceUrls).length;
  if (sources === 0) return { level: "Low", reason: "Sources unavailable for this result." };
  const ev = r.evidence ?? null;
  const ageDays = r.fetchedAt ? Math.max(0, (now - new Date(r.fetchedAt).getTime()) / DAY) : 0;

  // Agreement: spread of the area-specific rate mentions (max/min), and whether the headline
  // price sits near their median.
  let agreement: "strong" | "moderate" | "weak" | "unknown" = "unknown";
  if (ev?.count && ev.count >= 2 && ev.min && ev.max && ev.median) {
    const spread = ev.max / ev.min;
    const price = Number(r.currentPricePerSqft) || 0;
    const nearMedian = price > 0 && Math.abs(price - ev.median) / ev.median <= 0.2;
    agreement = spread <= 1.6 && nearMedian ? "strong" : spread <= 2.5 ? "moderate" : "weak";
  }

  const fresh = ageDays <= 7 && !r.stale;
  const ageText = ageDays < 1 ? "today" : `${Math.round(ageDays)} day${Math.round(ageDays) === 1 ? "" : "s"} old`;
  const srcText = `${sources} source${sources === 1 ? "" : "s"}`;

  if (sources >= 3 && agreement === "strong" && fresh) {
    return { level: "High", reason: `${srcText} for this area agree closely; data from ${ageText}.` };
  }
  if (sources <= 1 || agreement === "weak" || ageDays > 30) {
    const why = sources <= 1 ? `only ${srcText}`
      : agreement === "weak" ? `${srcText} disagree widely`
      : `data is ${ageText}`;
    return { level: "Low", reason: `Treat as a rough guide: ${why}.` };
  }
  const why = agreement === "unknown" ? "few area-specific price figures to cross-check"
    : agreement === "moderate" ? "sources broadly agree but vary"
    : !fresh ? `data is ${ageText}`
    : "sources agree, but fewer than 3";
  return { level: "Medium", reason: `${srcText}; ${why}.` };
}
