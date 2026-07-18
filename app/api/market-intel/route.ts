import { NextRequest, NextResponse } from "next/server";
import { getGateStatus, consumeSearch } from "@/lib/aiIntelGate";
import { getClientIp } from "@/lib/clientIp";
import { computeMarketIntel, getCached, setCache } from "@/lib/marketIntel";

// ─── POST handler ──────────────────────────────────────────────────────────────
// Thin wrapper around computeMarketIntel() (lib/marketIntel.ts): gate check -> 5-min cache ->
// compute -> cache-set -> gate-consume -> respond. All pricing/grounding logic lives in the
// shared module now -- this file only owns the single-type request/response contract, the
// free-check gate, and the short-lived result cache.

export async function POST(req: NextRequest) {
  const { location, propertyType, unit, countUsage } =
    await req.json() as { location?: string; propertyType?: string; unit?: string; countUsage?: boolean };

  if (!location?.trim()) {
    return NextResponse.json({ error: "Location is required" }, { status: 400 });
  }

  // Only the AI Intelligence page's own deliberate "Get Market Intelligence" action counts
  // against the anonymous free-check limit -- it sends countUsage:true. The passive "Area
  // Price Insight" fetch on property detail pages (and Price Reality Check's own internal
  // call, which already consumed a check at its own route) never send this flag, so simply
  // browsing listings can't silently burn a visitor's free checks.
  //
  // Gate check is read-only here -- a visitor shouldn't be charged one of their 3 free
  // checks for an attempt that ends up "unavailable" (no live data, Gemini failure, etc.);
  // the counter only actually increments right before a genuine success is returned, below.
  const clientIp = getClientIp(req);
  let usage = countUsage ? await getGateStatus(clientIp) : null;
  if (usage && !usage.allowed) {
    return NextResponse.json({ error: "usage_limit", ...usage }, { status: 403 });
  }
  // Attaches the honest "X of 3 free checks used" status to every response on this request
  // (success or unavailable) so the frontend can show it without a second round-trip.
  const respond = (body: Record<string, unknown>, status = 200) =>
    NextResponse.json(usage ? { ...body, usage } : body, { status });

  const loc          = location.trim();
  const resolvedUnit = unit ?? "sqft";
  const propType     = propertyType ?? "apartment";

  // ── Cache check ──────────────────────────────────────────────────────────
  const cacheKey = `${loc}|${propType}|${resolvedUnit}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[market-intel] Cache HIT for "${cacheKey}"`);
    return respond(cached);
  }

  const result = await computeMarketIntel(loc, propType, resolvedUnit);

  if (result.available === false) {
    return respond(result);
  }

  setCache(cacheKey, result);
  // Only now, on a confirmed genuine success, actually consume one of the visitor's free
  // checks -- everything above this point was read-only.
  if (countUsage) usage = await consumeSearch(clientIp);
  return respond(result);
}
