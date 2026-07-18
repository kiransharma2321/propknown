import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getGateStatus, consumeSearch } from "@/lib/aiIntelGate";
import { getClientIp } from "@/lib/clientIp";
import { computeMarketIntel, getCached, setCache } from "@/lib/marketIntel";
import { PROPERTY_TYPES, findHotMarket } from "@/lib/hotMarkets";

// Multi-type "location overview": one user action returns all of PROPERTY_TYPES for a single
// location instead of the single-type endpoint's one-type-per-call contract. Two paths:
//
// 1. Cache hit (location matches a hot market with precomputed rows in HotMarketCache, kept
//    fresh by app/api/cron/refresh-hot-markets): instant, zero live Gemini/Tavily calls, and
//    deliberately consumes ZERO free checks -- there's no cost to protect against, and it keeps
//    the hot-market overview effectively free/unlimited to browse.
// 2. Cache miss: one gate check, then Promise.all over every property type calling the exact
//    same computeMarketIntel() the single-type endpoint uses (lib/marketIntel.ts) -- no
//    duplicated pricing/grounding logic. Exactly ONE consumeSearch() call afterward if at least
//    one type succeeded, regardless of how many of the N calls actually returned data -- this is
//    what makes "one check per location" true rather than "one check per call".
export async function POST(req: NextRequest) {
  const { city, area } = await req.json() as { city?: string; area?: string };

  if (!city?.trim()) {
    return NextResponse.json({ error: "City is required" }, { status: 400 });
  }

  const cityTrim = city.trim();
  const areaTrim = area?.trim() ?? "";
  const loc = areaTrim ? `${areaTrim}, ${cityTrim}` : cityTrim;

  // ── Cache path: exact hot-market match, served free and instantly ──────────
  const hotMarket = areaTrim ? findHotMarket(cityTrim, areaTrim) : null;
  if (hotMarket) {
    const rows = await prisma.hotMarketCache.findMany({
      where: { city: hotMarket.city, area: hotMarket.area },
    });
    if (rows.length > 0) {
      const results: Record<string, Record<string, unknown>> = {};
      for (const r of rows) results[r.propertyType] = r.data as Record<string, unknown>;
      // Any property type the cron hasn't successfully cached yet (e.g. a transient failure on
      // the last refresh) is reported honestly as unavailable rather than silently omitted.
      for (const pt of PROPERTY_TYPES) {
        if (!results[pt.value]) results[pt.value] = { available: false, message: "Live market data is temporarily unavailable for this type. Please try again in a moment." };
      }
      return NextResponse.json({ results, usage: null, cached: true });
    }
  }

  // ── Live path: one gate check, parallel per-type calls, one gate consumption ───────────────
  const clientIp = getClientIp(req);
  const usage = await getGateStatus(clientIp);
  if (!usage.allowed) {
    return NextResponse.json({ error: "usage_limit", ...usage }, { status: 403 });
  }

  const settled = await Promise.all(
    PROPERTY_TYPES.map(async (pt) => {
      const cacheKey = `${loc}|${pt.value}|${pt.defaultUnit}`;
      const cached = getCached(cacheKey);
      if (cached) return { value: pt.value, result: cached };
      const result = await computeMarketIntel(loc, pt.value, pt.defaultUnit);
      if (result.available !== false) setCache(cacheKey, result);
      return { value: pt.value, result };
    })
  );

  const results: Record<string, Record<string, unknown>> = {};
  let anySucceeded = false;
  for (const { value, result } of settled) {
    results[value] = result;
    if (result.available !== false) anySucceeded = true;
  }

  // Only now, on at least one confirmed genuine success across the whole location, actually
  // consume ONE of the visitor's free checks -- mirrors the single-type endpoint's "only consume
  // on genuine success" rule, just scoped to the whole location instead of one call.
  const finalUsage = anySucceeded ? await consumeSearch(clientIp) : usage;

  return NextResponse.json({ results, usage: finalUsage, cached: false });
}
