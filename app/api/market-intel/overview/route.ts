import { NextRequest, NextResponse } from "next/server";
import { getGateStatus, consumeSearch } from "@/lib/aiIntelGate";
import { getClientIp } from "@/lib/clientIp";
import { getMarketPrice, type EngineResult } from "@/lib/engine";
import { PROPERTY_TYPES } from "@/lib/hotMarkets";

// Multi-type "location overview": one user action returns every PROPERTY_TYPES entry for a
// single location, all through the shared engine (lib/engine) so each figure matches what
// every other tool shows for the same place.
//
// 1. Fresh-cache pass: if every type already has a fresh cached price, it's served instantly
//    and consumes ZERO free checks -- there's no API cost to protect against.
// 2. Otherwise: one gate check, then live engine calls (in parallel, each under the engine's
//    10s deadline) for just the missing types, and exactly ONE consumeSearch() if any of them
//    succeeded live -- "one check per location", not per type.
export async function POST(req: NextRequest) {
  const { city, area } = await req.json() as { city?: string; area?: string };

  if (!city?.trim()) {
    return NextResponse.json({ error: "City is required" }, { status: 400 });
  }
  const areaTrim = area?.trim() ?? "";
  const loc = areaTrim ? `${areaTrim}, ${city.trim()}` : city.trim();

  const results: Record<string, EngineResult> = {};
  await Promise.all(PROPERTY_TYPES.map(async (pt) => {
    results[pt.value] = await getMarketPrice({ location: loc, propertyType: pt.value, tool: "ai_intel_overview", freshOnly: true, skipLog: true });
  }));
  const missing = PROPERTY_TYPES.filter((pt) => !results[pt.value].available);
  if (missing.length === 0) {
    return NextResponse.json({ results, usage: null, cached: true });
  }

  const clientIp = getClientIp(req);
  const usage = await getGateStatus(clientIp);
  if (!usage.allowed) {
    return NextResponse.json({ error: "usage_limit", ...usage }, { status: 403 });
  }

  let anyLive = false;
  await Promise.all(missing.map(async (pt) => {
    const r = await getMarketPrice({ location: loc, propertyType: pt.value, tool: "ai_intel_overview" });
    results[pt.value] = r;
    if (r.available) anyLive = true;
  }));

  const finalUsage = anyLive ? await consumeSearch(clientIp) : usage;
  return NextResponse.json({ results, usage: finalUsage, cached: false });
}
