import { NextRequest, NextResponse } from "next/server";
import { getGateStatus, consumeSearch } from "@/lib/aiIntelGate";
import { getClientIp } from "@/lib/clientIp";
import { getMarketPrice, INTERACTIVE_TIMEOUT_MS } from "@/lib/engine";

// A Google-Search-grounded Gemini call takes ~20-30s; Vercel's default would cut it off.
export const maxDuration = 60;

// ─── POST handler ──────────────────────────────────────────────────────────────
// Thin wrapper around the shared engine (lib/engine): gate check -> getMarketPrice() (cache
// first, then live under a 10s deadline) -> gate-consume -> respond. All pricing/grounding
// logic lives in the engine -- this file only owns the single-type request/response contract
// and the free-check gate.

export async function POST(req: NextRequest) {
  const { location, propertyType, unit, countUsage } =
    await req.json() as { location?: string; propertyType?: string; unit?: string; countUsage?: boolean };

  if (!location?.trim()) {
    return NextResponse.json({ error: "Location is required" }, { status: 400 });
  }

  // Only the AI Intelligence page's own deliberate "Get Market Intelligence" action counts
  // against the anonymous free-check limit -- it sends countUsage:true. The passive "Area
  // Price Insight" fetch on property detail pages never sends this flag, so simply browsing
  // listings can't silently burn a visitor's free checks.
  //
  // Gate check is read-only here -- a visitor shouldn't be charged one of their 3 free
  // checks for an attempt that ends up "unavailable"; the counter only increments right
  // before a genuine success is returned, below.
  const clientIp = getClientIp(req);
  let usage = countUsage ? await getGateStatus(clientIp) : null;
  if (usage && !usage.allowed) {
    return NextResponse.json({ error: "usage_limit", ...usage }, { status: 403 });
  }
  const respond = (body: Record<string, unknown>, status = 200) =>
    NextResponse.json(usage ? { ...body, usage } : body, { status });

  const result = await getMarketPrice({
    location: location.trim(),
    propertyType: propertyType ?? "apartment",
    unit: unit ?? undefined,
    tool: countUsage ? "ai_intel" : "property_insight",
    timeoutMs: INTERACTIVE_TIMEOUT_MS,
  });

  if (!result.available) return respond(result);

  // A stale "last updated" fallback isn't a fresh answer -- don't charge a free check for it.
  if (countUsage && !result.stale) usage = await consumeSearch(clientIp);
  return respond(result);
}
