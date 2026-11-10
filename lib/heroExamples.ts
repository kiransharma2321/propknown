// Homepage hero "Example Result" carousel data -- REAL recent results read straight from the
// shared engine's location_market_cache (never a Gemini call on homepage load). The homepage
// reads this server-side under ISR, so the DB is hit at most once per revalidate window.

import { prisma } from "@/lib/db";
import { PROPERTY_TYPES } from "@/lib/hotMarkets";
import { sourceHost } from "@/lib/engine/sources";

export interface HeroExample {
  id: string;
  area: string;
  city: string;
  propertyType: string;    // display label, e.g. "Apartment"
  currencySymbol: string;
  currency: string;
  price: number;
  rangeMin: number | null;
  rangeMax: number | null;
  unit: string;            // display unit, e.g. "sqft", "sq.yd", "acre"
  sources: string[];       // source domains, e.g. ["99acres.com", "magicbricks.com"]
  label: string;           // honest data-source label shown under the price
  capturedAt: string;      // ISO date the result was actually fetched
}

const MAX_EXAMPLES = 10;

// Only used when the cache has nothing usable yet (fresh DB). This is the real Kokapet result
// the static card has always shown, with its real capture month.
// No hardcoded fallback card: with no real, sourced example the carousel simply isn't shown.
const FALLBACK: HeroExample[] = [];

function unitDisplay(unit: string): string {
  return unit === "sqyard" ? "sq.yd" : unit === "acres" || unit === "acre" ? "acre" : unit === "sqm" ? "sq.m" : "sqft";
}

// Search-tooling/company-profile pages occasionally come back as "sources"; they aren't
// property data, so they're never shown as one on the homepage.
const hostOf = sourceHost;

export async function getHeroExamples(): Promise<HeroExample[]> {
  let rows: Awaited<ReturnType<typeof prisma.locationMarketCache.findMany>> = [];
  try {
    rows = await prisma.locationMarketCache.findMany({ where: { NOT: { locationKey: { startsWith: "project/" } } }, orderBy: { fetchedAt: "desc" }, take: 100 });
  } catch (e) {
    console.warn("[hero-examples] cache read failed:", e);
  }

  const examples: HeroExample[] = [];
  for (const row of rows) {
    const d = row.data as Record<string, unknown>;
    const price = Number(row.pricePerUnit);
    if (!(price > 0) || d.available === false) continue;
    // No real source -> not published (same rule as the engine).
    if (!Array.isArray(d.sourceUrls) || !(d.sourceUrls as string[]).some((u) => hostOf(u))) continue;
    // locationName is "Area, City" for every resolved locality; free-text fallbacks may be just one part.
    const [first, ...rest] = row.locationName.split(",").map((s) => s.trim()).filter(Boolean);
    const area = first;
    const city = row.city ?? rest[0] ?? "";
    const min = Number(d.priceRangeMin), max = Number(d.priceRangeMax);
    examples.push({
      id: row.id,
      area,
      city: city === area ? "" : city,
      propertyType: PROPERTY_TYPES.find((p) => p.value === row.propertyType)?.label ?? row.propertyType,
      currencySymbol: (d.currencySymbol as string) || (row.currency === "INR" ? "₹" : `${row.currency} `),
      currency: row.currency,
      price: Math.round(price),
      rangeMin: min > 0 ? Math.round(min) : null,
      rangeMax: max > 0 ? Math.round(max) : null,
      unit: unitDisplay(row.unit),
      sources: Array.isArray(d.sourceUrls)
        ? Array.from(new Set((d.sourceUrls as string[]).map(hostOf).filter((h): h is string => !!h))).slice(0, 3)
        : [],
      label: (d.dataSourceLabel as string) || "AI estimate based on live web search",
      capturedAt: row.fetchedAt.toISOString(),
    });
  }
  if (examples.length === 0) return FALLBACK;

  // Mix cities: round-robin across cities (most recent first within each) so consecutive
  // cards don't all show the same city.
  const byCity = new Map<string, HeroExample[]>();
  for (const ex of examples) {
    const k = ex.city.toLowerCase() || ex.area.toLowerCase();
    byCity.set(k, [...(byCity.get(k) ?? []), ex]);
  }
  const mixed: HeroExample[] = [];
  const queues = Array.from(byCity.values());
  while (mixed.length < MAX_EXAMPLES && queues.some((q) => q.length)) {
    for (const q of queues) {
      const next = q.shift();
      if (next && mixed.length < MAX_EXAMPLES) mixed.push(next);
    }
  }
  return mixed;
}
