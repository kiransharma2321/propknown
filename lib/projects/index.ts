import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { geminiJson } from "@/lib/ai/gemini";
import { aiJson } from "@/lib/ai/router";
import { webSearch } from "@/lib/search";
import { recordApiCall } from "@/lib/engine/usage";
import { sourceHost, isPriceSource } from "@/lib/engine/sources";
import { computeConfidence, type Confidence } from "@/lib/engine/confidence";
import { getMarketPrice, unitLabel, type EngineResult } from "@/lib/engine";
import { reraGuidance } from "@/lib/engine/rera";

// Project-level price check (Task K): "Is ₹X/sq.ft fair for <project>?". Facts and asking
// prices come only from live search results (listing portals + the builder's site), each tied to
// the source it came from; a RERA number is kept only if a source states it AND it matches the
// state's official format. Results are cached in the single price store (location_market_cache)
// under the key project/<slug>|<type>, 7 days, exactly like area prices (Task F).

const CACHE_TTL_MS = 7 * 86_400_000;
const PORTALS = ["99acres.com", "magicbricks.com", "housing.com", "squareyards.com", "nobroker.in", "proptiger.com", "makaan.com", "propertyfinder.ae", "bayut.com"];

export interface ProjectFact { value: string; sourceUrl: string; capturedAt: string }
export interface ProjectResult {
  found: boolean;
  name: string;
  query: { name: string; area: string; propertyType: string };
  facts: Partial<Record<"reraNumber" | "builder" | "location" | "projectType" | "status" | "possession", ProjectFact>>;
  // basis: "builder" = the builder's / new-launch asking price; "listings" = unclassified listing
  // figures; "resale" = only resale listings were found. (Older cached rows have no basis.)
  price: { min: number; max: number; median: number; unit: string; currency: string; sources: { host: string; url: string }[]; capturedAt: string; basis?: "builder" | "listings" | "resale" } | null;
  // Resale listings for the project, reported separately from the builder price.
  resale?: { min: number; max: number; median: number; sources: { host: string; url: string }[] } | null;
  confidence: Confidence | null;
  locality: { price: number; rangeMin: number | null; rangeMax: number | null; unit: string; capturedAt: string | null; confidence: Confidence | null } | null;
  verdict: { label: "Fair" | "Above market" | "Below market"; pctVsLocality: number } | null;
  cached: boolean;
  capturedAt: string;
}

export function projectSlug(name: string, area: string): string {
  return `${name} ${area}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

import { medianOf, pickProjectPrices, type PriceFigure } from "./sites";
export { sourceSiteCount, medianOf } from "./sites";

interface Hit { title: string; url: string; content: string }

async function searchTavily(query: string, domains?: string[], maxResults = 6): Promise<Hit[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: key, query, max_results: maxResults, search_depth: "basic", ...(domains ? { include_domains: domains } : {}) }),
    signal: AbortSignal.timeout(12_000),
  }).catch((e) => { recordApiCall("tavily", "error"); throw e; });
  recordApiCall("tavily", res.ok ? "ok" : [429, 432].includes(res.status) ? "rate_limited" : "error");
  if (!res.ok) return [];
  const data = await res.json() as { results?: Hit[] };
  return (data.results ?? []).filter((r) => r.url && isPriceSource(r.url));
}

interface Extracted {
  matchesProject: boolean;
  builder?: { value: string; source: number } | null;
  location?: { value: string; source: number } | null;
  projectType?: { value: string; source: number } | null;
  status?: { value: string; source: number } | null;
  possession?: { value: string; source: number } | null;
  reraNumber?: { value: string; source: number } | null;
  pricesPerSqft?: { value: number; source: number; listingType?: string; basis?: string; kind?: string }[];
}

// cacheOnly: never call the search/AI APIs (homepage render); a cached row is used whatever its
// age -- it carries its own captured date -- and no row means "not found".
// refresh: skip the cache and re-check live (admin/maintenance use).
export async function checkProject(input: { name: string; area: string; propertyType?: string; cacheOnly?: boolean; refresh?: boolean }): Promise<ProjectResult> {
  const name = input.name.trim().slice(0, 100);
  const area = input.area.trim().slice(0, 100);
  const propertyType = input.propertyType || "apartment";
  const slug = projectSlug(name, area);
  const id = `project/${slug}|${propertyType}`;

  const row = await prisma.locationMarketCache.findUnique({ where: { id } }).catch(() => null);
  let result: ProjectResult;
  if (row && !input.refresh && (input.cacheOnly || Date.now() - row.fetchedAt.getTime() < CACHE_TTL_MS)) {
    result = { ...(row.data as unknown as ProjectResult), cached: true };
  } else if (input.cacheOnly) {
    result = { found: false, name, query: { name, area, propertyType }, facts: {}, price: null, confidence: null, locality: null, verdict: null, cached: false, capturedAt: new Date().toISOString() };
  } else {
    result = await liveProject(name, area, propertyType);
    if (result.found && result.price) {
      await prisma.locationMarketCache.upsert({
        where: { id },
        create: { id, locationKey: `project/${slug}`, locationName: `${result.name}, ${area}`, city: null, propertyType, unit: result.price.unit, currency: result.price.currency, pricePerUnit: result.price.median, data: result as unknown as Prisma.InputJsonValue },
        update: { locationName: `${result.name}, ${area}`, unit: result.price.unit, currency: result.price.currency, pricePerUnit: result.price.median, data: result as unknown as Prisma.InputJsonValue, fetchedAt: new Date() },
      }).catch((e) => console.warn("[project] cache write failed:", e instanceof Error ? e.message : e));
    }
  }
  // Locality comparison is always read fresh from the area cache/engine.
  return withLocality(result, area, propertyType);
}

// Own Engine variant (free search chain + free-tier AI router), for the old-vs-new comparison.
// Same prompt, same price classification; never writes the cache.
export function liveProjectOwn(name: string, area: string, propertyType = "apartment"): Promise<ProjectResult> {
  return liveProject(name, area, propertyType, true);
}

async function liveProject(name: string, area: string, propertyType: string, own = false): Promise<ProjectResult> {
  const search = own
    ? async (q: string, domains?: string[], max = 6): Promise<Hit[]> => (await webSearch(q, { domains, maxResults: max, priceSourcesOnly: true })).map(({ title, url, content }) => ({ title, url, content }))
    : searchTavily;
  const extractJson = own ? async <T,>(prompt: string) => (await aiJson<T>(prompt, { timeoutMs: 40_000, maxTokens: 3000 })).value : geminiJson;
  const now = new Date().toISOString();
  const base: ProjectResult = { found: false, name, query: { name, area, propertyType }, facts: {}, price: null, confidence: null, locality: null, verdict: null, cached: false, capturedAt: now };
  // Portal search twice: exact phrase, and unquoted -- Telugu/Hindi names are spelt many ways in
  // English (Kousalya / Kowsalya), and an exact-phrase search alone misses most listings for a
  // variant spelling. The AI step below decides which results are this project.
  const [portal, loose, open] = await Promise.all([
    search(`"${name}" ${area} price per sq ft`, PORTALS).catch(() => []),
    search(`${name} ${area} price per sq ft`, PORTALS, 8).catch(() => []),
    search(`"${name}" ${area} builder RERA possession price`).catch(() => []),
  ]);
  const hits = Array.from(new Map([...portal, ...loose, ...open].map((h) => [h.url, h])).values()).slice(0, 14);
  if (!hits.length) return base;

  const numbered = hits.map((h, i) => `[${i}] ${h.title}\n${h.content.slice(0, 900)}`).join("\n\n");
  const x = await extractJson<Extracted>(`Do these search results describe the real-estate project "${name}" in or near "${area}"? Different English spellings of the same Indian name (e.g. Kousalya / Kowsalya, Sri / Shri) and a builder-name prefix count as the same project; a different project in the same area does not. Extract facts ONLY as written in the results, and prices ONLY from results about this project.
Return JSON: {"matchesProject": boolean (false if the results are about a different project or no specific project),
"builder","location","projectType","status","possession","reraNumber": each {"value","source": result index} or null,
"pricesPerSqft": [{"value": number (price per sq.ft in local currency, as stated or as stated price / stated area for THIS project), "source": result index,
  "listingType": "builder" (builder / new-launch / project price) | "resale" (an individual flat resold by an owner, or an average of resale listings) | "unknown",
  "basis": "super_built_up" | "built_up" | "carpet" | "unknown" (as the result states the area),
  "kind": "asking" | "registered" (registry / transaction / guidance rate) | "unknown"}] }.
Never guess. A RERA number must be copied exactly from a result. Skip "starting from" prices unless no other price is given.

RESULTS:
${numbered}`, { timeoutMs: 40_000, temperature: 0.1 }).catch(() => null);
  if (!x?.matchesProject) return base;

  const fact = (f?: { value: string; source: number } | null): ProjectFact | undefined =>
    f && f.value && hits[f.source] ? { value: String(f.value).slice(0, 160), sourceUrl: hits[f.source].url, capturedAt: now } : undefined;
  const facts: ProjectResult["facts"] = {
    builder: fact(x.builder), location: fact(x.location), projectType: fact(x.projectType),
    status: fact(x.status), possession: fact(x.possession),
  };
  // RERA: must come from a source and match the jurisdiction's official number format.
  const rera = fact(x.reraNumber);
  if (rera) {
    const g = reraGuidance({ location: area, reraNumber: rera.value.replace(/\s+/g, "") });
    if (g.format === "matches_known_format") facts.reraNumber = { ...rera, value: rera.value.replace(/\s+/g, "") };
  }
  for (const k of Object.keys(facts) as (keyof typeof facts)[]) if (!facts[k]) delete facts[k];

  // Builder vs resale vs registered, area basis, outliers: see pickProjectPrices (tested).
  const figs: PriceFigure[] = (x.pricesPerSqft ?? []).filter((p) => p.value > 100 && hits[p.source])
    .map((p) => ({ value: p.value, url: hits[p.source].url, host: sourceHost(hits[p.source].url) ?? hits[p.source].url, listingType: p.listingType, basis: p.basis, kind: p.kind }));
  const pick = pickProjectPrices(figs);
  const prices = pick.primary;
  const isDubai = /dubai|uae/i.test(area);
  // Median per website first, then across websites: one portal with many listings must not
  // outvote the others.
  const summary = (list: PriceFigure[]) => {
    const vals = list.map((p) => p.value).sort((a, b) => a - b);
    const bySite = new Map<string, number[]>();
    for (const p of list) bySite.set(p.host, [...(bySite.get(p.host) ?? []), p.value]);
    const urls = Array.from(new Set(list.map((p) => p.url)));
    return { min: Math.round(vals[0]), max: Math.round(vals[vals.length - 1]), median: Math.round(medianOf(Array.from(bySite.values()).map(medianOf))), sources: urls.map((url) => ({ url, host: sourceHost(url) ?? url })) };
  };
  const price: ProjectResult["price"] = prices.length ? { ...summary(prices), unit: "sqft", currency: isDubai ? "AED" : "INR", capturedAt: now, basis: pick.primaryKind } : null;
  const resale: ProjectResult["resale"] = pick.resale.length ? summary(pick.resale) : null;
  const confidence = price
    ? computeConfidence({ sourceUrls: price.sources.map((s) => s.url), evidence: { count: prices.length, min: price.min, max: price.max, median: price.median }, currentPricePerSqft: price.median, fetchedAt: now })
    : null;
  return { ...base, found: true, facts, price, resale, confidence };
}

async function withLocality(r: ProjectResult, area: string, propertyType: string): Promise<ProjectResult> {
  const m: EngineResult = await getMarketPrice({ location: area, propertyType, unit: "sqft", tool: "price_check", cacheOnly: true, skipLog: true }).catch(() => ({ available: false }) as EngineResult);
  const locality = m.available && m.currentPricePerSqft
    ? { price: m.currentPricePerSqft, rangeMin: (m.priceRangeMin as number) ?? null, rangeMax: (m.priceRangeMax as number) ?? null, unit: unitLabel("sqft"), capturedAt: (m.fetchedAt as string) ?? null, confidence: m.confidence ?? null }
    : null;
  let verdict: ProjectResult["verdict"] = null;
  if (r.price && locality) {
    const pct = Math.round(((r.price.median - locality.price) / locality.price) * 1000) / 10;
    const lo = locality.rangeMin ?? locality.price * 0.85, hi = locality.rangeMax ?? locality.price * 1.15;
    verdict = { label: r.price.median > hi ? "Above market" : r.price.median < lo ? "Below market" : "Fair", pctVsLocality: pct };
  }
  return { ...r, locality, verdict };
}

// Autocomplete: our own records first (approved listings, Approval Queue / Project Finder drafts,
// cached project checks). Public RERA search is captcha-protected, so it is not queried.
export async function suggestProjects(q: string) {
  const term = q.trim();
  if (term.length < 2) return [];
  const [props, drafts, cached] = await Promise.all([
    prisma.property.findMany({ where: { status: "approved", title: { contains: term, mode: "insensitive" } }, select: { title: true, location: true, city: true }, take: 5 }).catch(() => []),
    prisma.listingDraft.findMany({ where: { reviewStatus: { not: "rejected" }, projectName: { contains: term, mode: "insensitive" } }, select: { projectName: true, builder: true, location: true, city: true, reraNumber: true }, take: 5 }).catch(() => []),
    prisma.locationMarketCache.findMany({ where: { locationKey: { startsWith: "project/" }, locationName: { contains: term, mode: "insensitive" } }, select: { locationName: true, data: true }, take: 5 }).catch(() => []),
  ]);
  const out = [
    ...props.map((p) => ({ name: p.title.trim(), builder: null as string | null, area: [p.location, p.city].filter(Boolean).join(", "), source: "PropKnown listing" })),
    ...drafts.map((d) => ({ name: d.projectName, builder: d.builder, area: [d.location, d.city].filter(Boolean).join(", "), source: d.reraNumber ? `RERA ${d.reraNumber}` : "PropKnown project data" })),
    ...cached.map((c) => {
      const d = c.data as unknown as ProjectResult;
      return { name: d.name, builder: d.facts?.builder?.value ?? null, area: d.query?.area ?? "", source: "Checked before" };
    }),
  ];
  const seen = new Set<string>();
  return out.filter((o) => { const k = `${o.name}|${o.area}`.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 8);
}

// Cache-only project lookup that tolerates "Area" vs "Area, City": a check saved under
// "Bachupally" is found when asked for "Bachupally, Hyderabad" and vice versa. Never a paid call.
export async function findCachedProject(name: string, location: string, propertyType = "apartment"): Promise<ProjectResult | null> {
  const loc = location.trim();
  const tries = Array.from(new Set([loc, loc.split(",")[0].trim()].filter(Boolean)));
  for (const area of tries) {
    const r = await checkProject({ name, area, propertyType, cacheOnly: true }).catch(() => null);
    if (r?.found) return r;
  }
  return null;
}
