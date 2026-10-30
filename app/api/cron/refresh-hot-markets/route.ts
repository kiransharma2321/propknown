import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getMarketPrice } from "@/lib/engine";
import { isCronAuthorized } from "@/lib/cron";
import { HOT_MARKETS, PROPERTY_TYPES, hotMarketCacheId } from "@/lib/hotMarkets";

// Without this, `next build` probes GET handlers for static optimisation -- which once fired
// all the live Gemini/Tavily calls during a build. force-dynamic keeps this request-only.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Previously refreshed all 60 hot-market combos (10 markets x 6 types) every day -- ~1,800
// Tavily searches a month, more than Tavily's free plan allows, which is how the key hit its
// limit (HTTP 432). Now: refresh only combos whose cached price is older than STALE_DAYS, at
// most PER_RUN per day, oldest first, all through the shared engine (lib/engine) so the hot
// market pages show exactly the figure every other tool shows.
const STALE_DAYS = 7;
const PER_RUN = 12;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const combos = HOT_MARKETS.flatMap((m) => PROPERTY_TYPES.map((pt) => ({ market: m, propType: pt })));
  const existing = await prisma.hotMarketCache.findMany({ select: { id: true, updatedAt: true } });
  const age = new Map(existing.map((r) => [r.id, r.updatedAt.getTime()]));
  const staleBefore = Date.now() - STALE_DAYS * 86_400_000;
  const due = combos
    .map((c) => ({ ...c, ts: age.get(hotMarketCacheId(c.market.city, c.market.area, c.propType.value)) ?? 0 }))
    .filter((c) => c.ts < staleBefore)
    .sort((a, b) => a.ts - b.ts)
    .slice(0, PER_RUN);

  let succeeded = 0;
  const failures: { city: string; area: string; propertyType: string; reason: string }[] = [];

  // Sequential, two at a time -- gentle on upstream rate limits and well inside maxDuration.
  for (let i = 0; i < due.length; i += 2) {
    await Promise.all(due.slice(i, i + 2).map(async ({ market, propType }) => {
      const { city, area } = market;
      const result = await getMarketPrice({
        location: `${area}, ${city}`, propertyType: propType.value, unit: propType.defaultUnit,
        tool: "cron_refresh", forceRefresh: true, timeoutMs: 20_000,
      });
      if (!result.available) {
        failures.push({ city, area, propertyType: propType.value, reason: String(result.reason ?? "unavailable") });
        return;
      }
      const data = result as unknown as Prisma.InputJsonValue;
      const id = hotMarketCacheId(city, area, propType.value);
      await prisma.hotMarketCache.upsert({
        where: { id },
        create: { id, city, area, propertyType: propType.value, unit: propType.defaultUnit, data },
        update: { data },
      });
      succeeded++;
    }));
  }

  const durationMs = Date.now() - started;
  console.log(`[cron/refresh-hot-markets] ${succeeded}/${due.length} refreshed, ${failures.length} failed, ${durationMs}ms`);
  return NextResponse.json({ due: due.length, succeeded, failed: failures.length, failures, durationMs });
}
