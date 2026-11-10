// ─────────────────────────────────────────────────────────────────────────────
// PropKnown shared AI engine -- the ONE entry point every AI feature uses for a market price:
// Price Reality Check, AI Intelligence, Legal Shield (fraud + RERA), KnownAI chat, the voice
// agent, /prices SEO pages, Content Studio and the listing price check.
//
//   location text ──► resolveLocation() ──► location_market_cache (fresh? return it)
//                                       └─► computeMarketIntel() (Gemini + Tavily/Bayut, live)
//                                            └─► upsert cache ──► convert to requested unit
//
// Guarantees:
// - Same place + type => same cached number everywhere (one canonical key per locality, one
//   canonical unit per property type, converted on the way out).
// - Hard deadline (default 10s; the interactive price tools pass INTERACTIVE_TIMEOUT_MS because a
//   Google-Search-grounded Gemini call takes ~20-30s). On timeout or failure the caller gets the
//   last good cached result for that place (stale: true, with its real fetchedAt date), or
//   { available: false, message: UNAVAILABLE_MESSAGE } if there is none -- never an invented number.
// - Every call is logged to ai_queries (tool, location, type, result, timestamp).
// ─────────────────────────────────────────────────────────────────────────────

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeMarketIntel } from "@/lib/marketIntel";
import { matchLocality, type Locality } from "@/lib/localities";
import { defaultUnitFor } from "@/lib/hotMarkets";
import { computeConfidence, type Confidence, type ConfidenceInput } from "@/lib/engine/confidence";
import { getGuidanceValue, type GuidanceValue } from "@/lib/engine/guidance";
import { isPriceSource } from "@/lib/engine/sources";

export const ENGINE_TIMEOUT_MS = 10_000;
// AI Intelligence + Price Reality Check: grounded search needs more than 10s, and those routes
// run with maxDuration = 60, so this leaves headroom for the cache write and response.
export const INTERACTIVE_TIMEOUT_MS = 50_000;
export const UNAVAILABLE_MESSAGE = "Live data unavailable right now — please try again in a moment.";

// How long a cached price counts as current -- a result fresher than 7 days is served instead
// of calling Gemini again. Older rows are still served as a labelled "last updated" fallback
// when a live refresh fails, and /prices SEO pages read them cache-only.
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type AiTool =
  | "price_check" | "ai_intel" | "ai_intel_overview" | "legal_shield" | "rera" | "chat"
  | "voice" | "seo_page" | "cron_refresh" | "listing_check" | "crm_score" | "property_insight";

export type EngineResult = Record<string, unknown> & {
  available: boolean;
  message?: string;
  currentPricePerSqft?: number;
  priceRangeMin?: number;
  priceRangeMax?: number;
  pricePerSqftUnit?: string;
  currency?: string;
  currencySymbol?: string;
  locationName?: string;
  locationKey?: string;
  cached?: boolean;
  fetchedAt?: string;
  reason?: string;
  stale?: boolean;     // live refresh failed; this is the last good cached result
  confidence?: Confidence;
  guidanceValue?: GuidanceValue | null;
};

// ─── Location resolution ─────────────────────────────────────────────────────

export interface ResolvedLocation {
  key: string;          // canonical cache key, e.g. "hyderabad/kokapet"
  display: string;      // what's sent to search, e.g. "Kokapet, Hyderabad"
  city: string | null;
  locality: Locality | null;
}

export function resolveLocation(input: string): ResolvedLocation {
  const loc = matchLocality(input);
  if (loc) {
    return { key: `${loc.citySlug}/${loc.slug}`, display: `${loc.name}, ${loc.city}`, city: loc.city, locality: loc };
  }
  const display = input.trim().replace(/\s+/g, " ");
  const key = display.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/ /g, "-");
  return { key: `free/${key}`, display, city: null, locality: null };
}

// ─── Units ───────────────────────────────────────────────────────────────────

const UNIT_SQFT: Record<string, number> = { sqft: 1, sqyard: 9, sqm: 10.764, acres: 43560, acre: 43560 };

// Canonical (stored) unit: per type, and for plots per local convention (sq.yard in Telangana,
// sq.ft in Bengaluru/Mumbai/Dubai...). Cached rows keep their own unit and convert on the way out.
export function canonicalUnit(propertyType: string, location = ""): string {
  return defaultUnitFor(propertyType, location);
}

// Rescales every per-area figure in a result from one unit to another. Percentages (growth,
// yield) and text are untouched.
export function convertResult(data: Record<string, unknown>, from: string, to: string): Record<string, unknown> {
  const f = UNIT_SQFT[from], t = UNIT_SQFT[to];
  if (!f || !t || from === to) return { ...data, pricePerSqftUnit: UNIT_SQFT[to] ? to : from };
  const k = t / f;
  const scale = (v: unknown) => (typeof v === "number" ? Math.round(v * k) : v);
  const series = (v: unknown) =>
    Array.isArray(v) ? v.map((p: { year: number; value: number }) => ({ ...p, value: Math.round(p.value * k) })) : v;
  return {
    ...data,
    currentPricePerSqft: scale(data.currentPricePerSqft),
    priceRangeMin: scale(data.priceRangeMin),
    priceRangeMax: scale(data.priceRangeMax),
    priceHistory5yr: series(data.priceHistory5yr),
    priceForecast5yr: series(data.priceForecast5yr),
    pricePerSqftUnit: to === "acre" ? "acres" : to,
  };
}

// Area-specific rate evidence is stored in the canonical unit; rescale it alongside the price.
function scaleEvidence(ev: NonNullable<ConfidenceInput["evidence"]>, from: string, to: string): NonNullable<ConfidenceInput["evidence"]> {
  const f = UNIT_SQFT[from], t = UNIT_SQFT[to];
  if (!f || !t || from === to) return ev;
  const k = t / f, sc = (v?: number) => (typeof v === "number" ? Math.round(v * k) : v);
  return { ...ev, min: sc(ev.min), max: sc(ev.max), median: sc(ev.median) };
}

// ─── Logging ─────────────────────────────────────────────────────────────────

export async function logAiQuery(entry: {
  tool: AiTool; location?: string | null; locationKey?: string | null; propertyType?: string | null;
  result: string; pricePerUnit?: number | null; unit?: string | null; currency?: string | null;
  cached?: boolean; durationMs?: number;
}): Promise<void> {
  try {
    await prisma.aiQuery.create({
      data: {
        tool: entry.tool,
        location: entry.location?.slice(0, 200) ?? null,
        locationKey: entry.locationKey ?? null,
        propertyType: entry.propertyType ?? null,
        result: entry.result,
        pricePerUnit: entry.pricePerUnit ?? null,
        unit: entry.unit ?? null,
        currency: entry.currency ?? null,
        cached: entry.cached ?? false,
        durationMs: entry.durationMs ?? null,
      },
    });
  } catch (e) {
    // Logging must never break the feature itself.
    console.warn("[engine] ai_queries log failed:", e);
  }
}

// ─── Core ────────────────────────────────────────────────────────────────────

export interface EngineRequest {
  location: string;
  propertyType?: string;
  unit?: string;
  tool: AiTool;
  timeoutMs?: number;
  forceRefresh?: boolean;  // skip a fresh cache row (cron refreshes)
  cacheOnly?: boolean;     // never call live APIs; return the cached row even if stale (SEO pages)
  freshOnly?: boolean;     // never call live APIs; return only a fresh cached row
  skipLog?: boolean;       // caller logs once itself (e.g. multi-type overview)
}

function unavailable(reason: string, resolved?: ResolvedLocation): EngineResult {
  return { available: false, message: UNAVAILABLE_MESSAGE, reason, locationKey: resolved?.key };
}

export async function getMarketPrice(req: EngineRequest): Promise<EngineResult> {
  const started = Date.now();
  const propertyType = req.propertyType || "apartment";
  if (!req.location?.trim()) return unavailable("no location");
  const resolved = resolveLocation(req.location);
  const baseUnit = canonicalUnit(propertyType, resolved.display);
  const outUnit = req.unit && UNIT_SQFT[req.unit] ? req.unit : baseUnit;
  const id = `${resolved.key}|${propertyType}`;

  const finish = async (raw: EngineResult, cached: boolean): Promise<EngineResult> => {
    const result = await enrich(raw);
    if (!req.skipLog) {
      await logAiQuery({
        tool: req.tool, location: req.location, locationKey: resolved.key, propertyType,
        result: result.available ? "ok" : (result.reason === "timeout" ? "timeout" : "unavailable"),
        pricePerUnit: (result.currentPricePerSqft as number) ?? null,
        unit: (result.pricePerSqftUnit as string) ?? null,
        currency: (result.currency as string) ?? null,
        cached, durationMs: Date.now() - started,
      });
    }
    return result;
  };

  const fromRow = (row: { data: Prisma.JsonValue; unit: string; fetchedAt: Date }, cached: boolean): EngineResult => ({
    ...(convertResult(row.data as Record<string, unknown>, row.unit, outUnit) as EngineResult),
    available: true,
    locationKey: resolved.key,
    cached,
    fetchedAt: row.fetchedAt.toISOString(),
  });

  // Confidence (recomputed every time, so it drops as a cached row ages) and the official
  // guidance value, attached to every available result on the way out.
  const enrich = async (r: EngineResult): Promise<EngineResult> => {
    if (!r.available) return r;
    // Older cached rows predate the source filter; drop non-source hosts (and duplicates) here too.
    const sourceUrls = Array.isArray(r.sourceUrls)
      ? Array.from(new Set((r.sourceUrls as unknown[]).map(String).filter(isPriceSource)))
      : [];
    const evidence = (r.evidence ?? null) as ConfidenceInput["evidence"];
    const confidence = computeConfidence({
      sourceUrls, evidence: evidence ? scaleEvidence(evidence, baseUnit, outUnit) : null,
      currentPricePerSqft: r.currentPricePerSqft, fetchedAt: r.fetchedAt, stale: r.stale,
    });
    const guidanceValue = await getGuidanceValue(resolved.key, propertyType, String(r.pricePerSqftUnit ?? outUnit));
    // Rows cached before rounding was added can hold a fractional price; show whole units.
    const price = typeof r.currentPricePerSqft === "number" ? Math.round(r.currentPricePerSqft) : r.currentPricePerSqft;
    return { ...r, currentPricePerSqft: price, sourceUrls, confidence, guidanceValue };
  };

  // 1. Cache
  let row: Awaited<ReturnType<typeof prisma.locationMarketCache.findUnique>> = null;
  try {
    row = await prisma.locationMarketCache.findUnique({ where: { id } });
  } catch (e) {
    console.warn("[engine] cache read failed:", e);
  }
  const fresh = row && Date.now() - row.fetchedAt.getTime() < CACHE_TTL_MS;
  if (row && (req.cacheOnly || (fresh && !req.forceRefresh))) return finish(fromRow(row, true), true);
  if (req.cacheOnly || req.freshOnly) return finish(unavailable("not cached yet", resolved), false);

  // 2. Live, under a hard deadline that also aborts in-flight upstream requests.
  const timeoutMs = req.timeoutMs ?? ENGINE_TIMEOUT_MS;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => { controller.abort(); resolve("timeout"); }, timeoutMs);
  });

  let live: Record<string, unknown> | "timeout";
  try {
    live = await Promise.race([
      computeMarketIntel(resolved.display, propertyType, baseUnit, controller.signal),
      deadline,
    ]);
  } catch (e) {
    live = { available: false, message: `engine error: ${e instanceof Error ? e.message : String(e)}` };
  }
  clearTimeout(timer);

  // Live failed -> last good cached result, labelled with its real capture date.
  const staleOr = (reason: string): Promise<EngineResult> => {
    console.error(`[market-intel] live refresh failed for "${resolved.display}" (${propertyType}): ${reason}${row ? ` -- serving cached result from ${row.fetchedAt.toISOString()}` : ""}`);
    return row
      ? finish({ ...fromRow(row, true), stale: true }, true)
      : finish(unavailable(reason, resolved), false);
  };
  if (live === "timeout") return staleOr("timeout");
  if (live.available === false) return staleOr(String(live.message ?? "no live data"));

  const price = Number(live.currentPricePerSqft);
  const now = new Date();
  try {
    const saved = await prisma.locationMarketCache.upsert({
      where: { id },
      create: {
        id, locationKey: resolved.key, locationName: resolved.display, city: resolved.city,
        propertyType, unit: baseUnit, currency: String(live.currency ?? ""), pricePerUnit: price,
        data: live as Prisma.InputJsonValue, fetchedAt: now,
      },
      update: {
        locationName: resolved.display, unit: baseUnit, currency: String(live.currency ?? ""),
        pricePerUnit: price, data: live as Prisma.InputJsonValue, fetchedAt: now,
        // Keep the last *different* figure so movers can be measured across refreshes.
        ...(row && row.pricePerUnit !== price ? { previousPrice: row.pricePerUnit, previousAt: row.fetchedAt } : {}),
      },
    });
    return finish(fromRow(saved, false), false);
  } catch (e) {
    console.warn("[engine] cache write failed:", e);
    return finish(fromRow({ data: live as Prisma.JsonValue, unit: baseUnit, fetchedAt: now }, false), false);
  }
}

// Remaining milliseconds until an absolute deadline, floored at 0 -- used by features that
// combine an engine call with their own Gemini call inside one 10s budget.
export function remaining(deadlineAt: number): number {
  return Math.max(0, deadlineAt - Date.now());
}

export function currencySymbolFor(code?: string | null): string {
  switch (code) {
    case "INR": return "₹";
    case "AED": return "AED ";
    case "USD": return "$";
    case "GBP": return "£";
    case "SGD": return "S$";
    default: return code ? `${code} ` : "";
  }
}

export function unitLabel(unit?: string | null): string {
  return unit === "sqyard" ? "sq.yd" : unit === "acres" || unit === "acre" ? "acre" : unit === "sqm" ? "sq.m" : "sq.ft";
}
