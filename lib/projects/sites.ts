import type { ProjectResult } from "./index";

export type { ProjectResult };

// How many independent websites a price comes from (two pages on one portal count once) --
// the number shown to visitors, consistent with the confidence rule. Pure, so client
// components can import it without pulling in the database layer.
export function sourceSiteCount(price: Pick<NonNullable<ProjectResult["price"]>, "sources">): number {
  return new Set(price.sources.map((s) => s.host)).size;
}

export function medianOf(xs: number[]): number {
  const v = [...xs].sort((a, b) => a - b);
  return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
}

// Which extracted price figures make up a project's "asking price" (pure; tested).
// Listing pages mix the builder's price with resale flats and different area bases, which made
// e.g. Kowsalya Manidweepam read Rs 6,800-8,235 when the builder price is about Rs 6,274-6,800.
// Rules:
//  1. Registered / transaction rates are not asking prices -> dropped.
//  2. Outliers (below 0.6x or above 1.67x the median of what's left) -> dropped.
//  3. If any builder / new-launch figure exists, the asking price uses only those; resale
//     listings are reported separately. Otherwise unclassified figures, then resale, are used.
//  4. Carpet-area figures run higher for the same flat, so they're left out when built-up or
//     super built-up figures exist.
export interface PriceFigure { value: number; host: string; url: string; listingType?: string; basis?: string; kind?: string }
export interface PricePick { primary: PriceFigure[]; resale: PriceFigure[]; primaryKind: "builder" | "listings" | "resale"; dropped: { value: number; host: string; reason: string }[] }

export function pickProjectPrices(figs: PriceFigure[]): PricePick {
  const dropped: PricePick["dropped"] = [];
  const keep = figs.filter((f) => {
    if (f.kind === "registered") { dropped.push({ value: f.value, host: f.host, reason: "registered/transaction rate, not an asking price" }); return false; }
    return f.value > 100;
  });
  const mid = keep.length ? medianOf(keep.map((f) => f.value)) : 0;
  const sane = keep.filter((f) => {
    const ok = f.value >= mid * 0.6 && f.value <= mid / 0.6;
    if (!ok) dropped.push({ value: f.value, host: f.host, reason: "outlier vs the other figures" });
    return ok;
  });
  const builder = sane.filter((f) => f.listingType === "builder");
  const resale = sane.filter((f) => f.listingType === "resale");
  const unknown = sane.filter((f) => f.listingType !== "builder" && f.listingType !== "resale");
  let primary: PriceFigure[]; let primaryKind: PricePick["primaryKind"];
  if (builder.length) { primary = builder; primaryKind = "builder"; for (const f of unknown) dropped.push({ value: f.value, host: f.host, reason: "unclassified listing figure; builder price available" }); }
  else if (unknown.length) { primary = unknown; primaryKind = "listings"; }
  else { primary = resale; primaryKind = "resale"; }
  if (primary.some((f) => f.basis !== "carpet") && primary.some((f) => f.basis === "carpet")) {
    for (const f of primary.filter((x) => x.basis === "carpet")) dropped.push({ value: f.value, host: f.host, reason: "carpet-area rate; built-up rates available" });
    primary = primary.filter((f) => f.basis !== "carpet");
  }
  return { primary, resale: primaryKind === "resale" ? [] : resale, primaryKind, dropped };
}
