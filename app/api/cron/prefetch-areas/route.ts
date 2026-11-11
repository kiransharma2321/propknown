import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCronAuthorized } from "@/lib/cron";
import { getMarketPrice } from "@/lib/engine";
import { PREFETCH, PREFETCH_PER_DAY, REFRESH_AFTER_DAYS, quotaHeadroom } from "@/lib/areaGuides";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Daily: check up to PREFETCH_PER_DAY localities from the PREFETCH list (lib/areaGuides.ts) --
// never-checked ones first, then the stalest (older than REFRESH_AFTER_DAYS). Quota-aware: stops
// while there is still headroom left for visitors. Sourced results appear on /area-prices.
const BUDGET_MS = 260_000;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const started = Date.now();
  const all = PREFETCH.flatMap((p) => p.areas.map((a) => `${a}, ${p.city}`));
  const rows = await prisma.locationMarketCache.findMany({ where: { propertyType: "apartment" }, select: { locationName: true, fetchedAt: true } }).catch(() => []);
  const lastCheck = new Map(rows.map((r) => [r.locationName.toLowerCase().replace(/, india$|, uae$/, ""), r.fetchedAt.getTime()]));
  const staleBefore = Date.now() - REFRESH_AFTER_DAYS * 86_400_000;
  const due = all
    .map((loc) => ({ loc, at: lastCheck.get(loc.toLowerCase()) ?? 0 }))
    .filter((x) => x.at < staleBefore)
    .sort((a, b) => a.at - b.at)
    .slice(0, PREFETCH_PER_DAY);

  const done: { loc: string; ok: boolean }[] = [];
  let stopped = "";
  for (const { loc } of due) {
    if (Date.now() - started > BUDGET_MS) { stopped = "time budget"; break; }
    const q = await quotaHeadroom();
    if (!q.ok) { stopped = `quota: ${q.note}`; break; }
    const r = await getMarketPrice({ location: loc, propertyType: "apartment", tool: "cron_refresh", forceRefresh: true, timeoutMs: 20_000, skipLog: false }).catch(() => null);
    done.push({ loc, ok: !!r?.available });
  }
  return NextResponse.json({ candidates: due.length, checked: done.length, withPrice: done.filter((d) => d.ok).length, stopped: stopped || null, results: done });
}
