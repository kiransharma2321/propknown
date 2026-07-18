import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeMarketIntel } from "@/lib/marketIntel";
import { HOT_MARKETS, PROPERTY_TYPES, hotMarketCacheId } from "@/lib/hotMarkets";

// Without this, Next.js's build step probes GET route handlers to check whether they can be
// statically optimized -- which means it actually CALLS this GET function with a dummy request
// during `next build`/`npm run build`, no real HTTP request involved. Confirmed the hard way:
// a build run without this line fired all 60 real Gemini/Tavily calls and wrote to the live
// HotMarketCache table as a side effect of building, since isAuthorized() correctly no-ops when
// CRON_SECRET isn't set (as it wasn't, locally). force-dynamic opts this route out of that
// static-optimization probe entirely, so it only ever runs on a genuine request.
export const dynamic = "force-dynamic";

// Vercel Cron invokes this via GET on the schedule in vercel.json, sending
// `Authorization: Bearer ${CRON_SECRET}` automatically when CRON_SECRET is set as a project env
// var. Same Bearer-stripping check style as app/api/leads/inbound/route.ts (the one existing
// precedent for this in the codebase) -- optional (no-ops if CRON_SECRET isn't set) so local
// testing without the env var still works, but required in production once it's configured.
const CRON_SECRET = process.env.CRON_SECRET ?? "";

function isAuthorized(req: NextRequest): boolean {
  if (!CRON_SECRET) return true;
  const authHeader = req.headers.get("authorization") ?? "";
  const provided = authHeader.replace(/^Bearer\s+/i, "");
  return provided === CRON_SECRET;
}

// Runs `fn` over every item in `items`, at most `limit` in flight at once -- 60 combinations
// (10 hot markets x 6 property types) fired all at once would hammer Tavily/Gemini
// simultaneously; small batches keep this closer to how a real user's traffic actually arrives.
async function runWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const combos = HOT_MARKETS.flatMap((m) => PROPERTY_TYPES.map((pt) => ({ market: m, propType: pt })));

  let succeeded = 0;
  let failed = 0;
  const failures: { city: string; area: string; propertyType: string; reason: string }[] = [];

  await runWithConcurrency(combos, 4, async ({ market, propType }) => {
    const { city, area } = market;
    const loc = `${area}, ${city}`;
    try {
      const result = await computeMarketIntel(loc, propType.value, propType.defaultUnit);
      if (result.available === false) {
        failed++;
        failures.push({ city, area, propertyType: propType.value, reason: (result.message as string) ?? "unavailable" });
        return;
      }
      const jsonData = result as unknown as Prisma.InputJsonValue;
      await prisma.hotMarketCache.upsert({
        where:  { id: hotMarketCacheId(city, area, propType.value) },
        create: { id: hotMarketCacheId(city, area, propType.value), city, area, propertyType: propType.value, unit: propType.defaultUnit, data: jsonData },
        update: { data: jsonData },
      });
      succeeded++;
    } catch (e) {
      failed++;
      failures.push({ city, area, propertyType: propType.value, reason: e instanceof Error ? e.message : String(e) });
    }
  });

  const durationMs = Date.now() - started;
  console.log(`[cron/refresh-hot-markets] ${succeeded} succeeded, ${failed} failed, ${durationMs}ms`);

  return NextResponse.json({ succeeded, failed, failures, durationMs });
}
