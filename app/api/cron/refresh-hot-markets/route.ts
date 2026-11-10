import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMarketPrice, resolveLocation } from "@/lib/engine";
import { isCronAuthorized } from "@/lib/cron";
import { HOT_MARKETS, PROPERTY_TYPES } from "@/lib/hotMarkets";

// Without this, `next build` probes GET handlers for static optimisation -- which once fired
// all the live Gemini/Tavily calls during a build. force-dynamic keeps this request-only.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Keeps the hot markets fresh in the ONE price store, location_market_cache (Task F: every page,
// report and chat reads only that table, so this job no longer writes a second copy). Refreshes
// only combos whose cached price is older than STALE_DAYS, at most PER_RUN per day, oldest first.
const STALE_DAYS = 7;
const PER_RUN = 12;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const combos = HOT_MARKETS.flatMap((m) => PROPERTY_TYPES.map((pt) => ({
    market: m, propType: pt, id: `${resolveLocation(`${m.area}, ${m.city}`).key}|${pt.value}`,
  })));
  const existing = await prisma.locationMarketCache.findMany({ where: { id: { in: combos.map((c) => c.id) } }, select: { id: true, fetchedAt: true } });
  const age = new Map(existing.map((r) => [r.id, r.fetchedAt.getTime()]));
  const staleBefore = Date.now() - STALE_DAYS * 86_400_000;
  const due = combos
    .map((c) => ({ ...c, ts: age.get(c.id) ?? 0 }))
    .filter((c) => c.ts < staleBefore)
    .sort((a, b) => a.ts - b.ts)
    .slice(0, PER_RUN);

  let succeeded = 0;
  const failures: { city: string; area: string; propertyType: string; reason: string }[] = [];

  // Two at a time -- gentle on upstream rate limits and well inside maxDuration.
  for (let i = 0; i < due.length; i += 2) {
    await Promise.all(due.slice(i, i + 2).map(async ({ market, propType }) => {
      const { city, area } = market;
      const result = await getMarketPrice({
        location: `${area}, ${city}`, propertyType: propType.value,
        tool: "cron_refresh", forceRefresh: true, timeoutMs: 20_000,
      });
      // A failed refresh leaves the last good row (and its real date) in place.
      if (!result.available || result.stale) {
        failures.push({ city, area, propertyType: propType.value, reason: String(result.reason ?? (result.stale ? "live refresh failed; kept last result" : "unavailable")) });
        return;
      }
      succeeded++;
    }));
  }

  const durationMs = Date.now() - started;
  console.log(`[cron/refresh-hot-markets] ${succeeded}/${due.length} refreshed, ${failures.length} failed, ${durationMs}ms`);
  return NextResponse.json({ due: due.length, succeeded, failed: failures.length, failures, durationMs });
}
