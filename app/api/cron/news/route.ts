import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCronAuthorized } from "@/lib/cron";
import { collectNews } from "@/lib/news/collect";
import { draftFromItem, draftMarketPulse } from "@/lib/news/draft";
import { planEpisodes } from "@/lib/podcast/planner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily: collect developments from the approved sources, then draft up to 2 articles from the
// most relevant unused items (plus the weekly Market Pulse on Mondays). Everything lands in Blog
// Studio as a DRAFT; nothing is published without the admin's approval.
const DRAFTS_PER_DAY = 2;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const collected = await collectNews();

  const candidates = await prisma.newsItem.findMany({
    where: { postId: null, relevance: { gte: 6 }, fetchedAt: { gte: new Date(Date.now() - 3 * 86_400_000) } },
    orderBy: [{ relevance: "desc" }, { fetchedAt: "desc" }], take: DRAFTS_PER_DAY,
  });
  const drafted: string[] = [];
  const failures: string[] = [];
  for (const item of candidates) {
    try {
      const post = await draftFromItem(item);
      if (post) drafted.push(post.title);
    } catch (e) { failures.push(`${item.title.slice(0, 60)}: ${e instanceof Error ? e.message.slice(0, 100) : "error"}`); }
  }
  let pulse: string | null = null;
  let podcastIdeas = 0;
  if (new Date().getUTCDay() === 1) {
    try { pulse = (await draftMarketPulse())?.title ?? null; } catch (e) { failures.push(`market pulse: ${e instanceof Error ? e.message.slice(0, 100) : "error"}`); }
    // Weekly podcast planner rides on the same Monday run (no extra cron job needed).
    try { podcastIdeas = (await planEpisodes()).length; } catch (e) { failures.push(`podcast planner: ${e instanceof Error ? e.message.slice(0, 100) : "error"}`); }
  }
  console.log(`[cron/news] collected ${collected.added}/${collected.fetched}, drafted ${drafted.length}${pulse ? " + market pulse" : ""}, ${failures.length + collected.errors.length} errors`);
  return NextResponse.json({ ...collected, drafted, pulse, podcastIdeas, failures });
}
