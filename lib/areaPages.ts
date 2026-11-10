import { cache } from "react";
import { prisma } from "@/lib/db";
import { getMarketPrice, unitLabel, type EngineResult } from "@/lib/engine";
import { computeConfidence, sourceDomains, type Confidence } from "@/lib/engine/confidence";
import { isPriceSource } from "@/lib/engine/sources";
import { ALL_LOCALITIES, PAGE_CITIES, findLocality, nearbyLocalities, type Locality } from "@/lib/localities";
import { HOT_MARKETS, PROPERTY_TYPES, slugify as hotSlug } from "@/lib/hotMarkets";

// The one canonical set of area price pages: /ai-intelligence/[city]/[area]. Pages read prices
// ONLY from the cache tables (never a live Gemini/Tavily call during render, never a hardcoded
// number). getAreaPrices() is the single read path -- see Task F for the source of truth.


export interface AreaPage {
  city: string; citySlug: string; area: string; areaSlug: string;
  types: string[]; locality: Locality | null;
}

export function allAreaPages(): AreaPage[] {
  const pages = new Map<string, AreaPage>();
  for (const l of ALL_LOCALITIES.filter((l) => PAGE_CITIES.includes(l.citySlug))) {
    pages.set(`${l.citySlug}/${l.slug}`, { city: l.city, citySlug: l.citySlug, area: l.name, areaSlug: l.slug, types: l.propertyTypes, locality: l });
  }
  for (const m of HOT_MARKETS) {
    const citySlug = hotSlug(m.city), areaSlug = hotSlug(m.area);
    const key = `${citySlug}/${areaSlug}`;
    if (!pages.has(key)) {
      const loc = findLocality(citySlug, areaSlug) ?? null;
      pages.set(key, { city: m.city, citySlug, area: m.area, areaSlug, types: PROPERTY_TYPES.map((p) => p.value), locality: loc });
    }
  }
  return Array.from(pages.values());
}

export function findAreaPage(citySlug: string, areaSlug: string): AreaPage | null {
  return allAreaPages().find((p) => p.citySlug === citySlug && p.areaSlug === areaSlug) ?? null;
}

export function areaPath(p: Pick<AreaPage, "citySlug" | "areaSlug">): string {
  return `/ai-intelligence/${p.citySlug}/${p.areaSlug}`;
}

export interface TypePrice {
  type: string; label: string;
  price: number | null; unit: string; symbol: string;
  rangeMin: number | null; rangeMax: number | null;
  capturedAt: string | null; confidence: Confidence | null;
  sources: { host: string; url: string }[];
  summary: string | null;
}

const typeLabel = (t: string) => PROPERTY_TYPES.find((p) => p.value === t)?.label ?? t;

function toTypePrice(type: string, d: Record<string, unknown> | null, capturedAt: string | null): TypePrice {
  const empty: TypePrice = { type, label: typeLabel(type), price: null, unit: "", symbol: "", rangeMin: null, rangeMax: null, capturedAt: null, confidence: null, sources: [], summary: null };
  if (!d || d.available === false || !(Number(d.currentPricePerSqft) > 0)) return empty;
  const urls = (Array.isArray(d.sourceUrls) ? d.sourceUrls : []).map(String).filter(isPriceSource);
  const sources = Array.from(new Set(urls)).map((url) => ({ url, host: sourceDomains([url])[0] })).filter((s) => s.host);
  const confidence = sources.length === 0
    ? { level: "Low" as const, reason: "Sources unavailable for this result." }
    : computeConfidence({ sourceUrls: urls, evidence: (d.evidence ?? null) as never, currentPricePerSqft: d.currentPricePerSqft, fetchedAt: capturedAt });
  return {
    ...empty,
    price: Number(d.currentPricePerSqft), unit: unitLabel(String(d.pricePerSqftUnit ?? "sqft")), symbol: String(d.currencySymbol ?? ""),
    rangeMin: Number(d.priceRangeMin) || null, rangeMax: Number(d.priceRangeMax) || null,
    capturedAt, confidence, sources, summary: typeof d.summary === "string" && d.summary ? d.summary : null,
  };
}

// Cache-only read from the ONE price store, location_market_cache (Task F) -- the same rows the
// homepage, AI Intel, reports, PDF and KnownAI use. Each price carries its own captured date.
export const getAreaPrices = cache(async (page: AreaPage): Promise<TypePrice[]> => {
  const location = `${page.area}, ${page.city}`;
  return Promise.all(page.types.map(async (type) => {
    const r: EngineResult = await getMarketPrice({ location, propertyType: type, tool: "seo_page", cacheOnly: true, skipLog: true })
      .catch(() => ({ available: false }) as EngineResult);
    return toTypePrice(type, r.available ? r : null, r.available ? String(r.fetchedAt ?? "") : null);
  }));
});

export function nearbyPages(page: AreaPage, max = 6): AreaPage[] {
  if (!page.locality) return [];
  return nearbyLocalities(page.locality, max)
    .map((l) => findAreaPage(l.citySlug, l.slug))
    .filter((p): p is AreaPage => !!p);
}

// For the sitemap: area pages that have at least one cached price, with the newest row date.
export async function areaPagesWithData(): Promise<{ path: string; lastModified: Date }[]> {
  const pages = allAreaPages();
  const engineRows = await prisma.locationMarketCache.findMany({ where: { pricePerUnit: { gt: 0 } }, select: { locationKey: true, locationName: true, propertyType: true, fetchedAt: true } });
  const newest = new Map<string, Date>();
  const bump = (key: string, d: Date) => { const cur = newest.get(key); if (!cur || d > cur) newest.set(key, d); };
  for (const row of engineRows) {
    const p = pages.find((pg) => pg.types.includes(row.propertyType)
      && (row.locationKey === `${pg.citySlug}/${pg.areaSlug}` || row.locationName.toLowerCase() === `${pg.area}, ${pg.city}`.toLowerCase()));
    if (p) bump(areaPath(p), row.fetchedAt);
  }
  return Array.from(newest.entries()).map(([path, lastModified]) => ({ path, lastModified }));
}

