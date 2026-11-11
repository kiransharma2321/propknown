import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { FEATURES } from "@/lib/features";
import { runResearch } from "@/lib/research";
import { recheckDue } from "@/lib/research/recheck";
import { RESEARCH_CITIES, CATEGORIES } from "@/lib/research/rules";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Auto Listing Researcher, daily: one city per day in rotation (all categories, a few projects
// each, free-tier AI and search), then re-checks live researched listings due every 2 weeks.
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!FEATURES.listingResearcher) return NextResponse.json({ skipped: "feature off" });
  const day = Math.floor(Date.now() / 86_400_000);
  const city = RESEARCH_CITIES[day % RESEARCH_CITIES.length];
  const r = await runResearch(city, CATEGORIES.map((c) => c.id), { trigger: "cron", perCategory: { apartment: 4, villa: 3, plot_layout: 3, farmland: 2, commercial: 2 } });
  const recheck = await recheckDue(6);
  return NextResponse.json({ city, run: r.runId, stats: r.stats, recheck });
}
