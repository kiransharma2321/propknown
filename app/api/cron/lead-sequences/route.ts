import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCronAuthorized } from "@/lib/cron";
import { getMarketPrice } from "@/lib/engine";
import { matchLocality, nearbyLocalities, localityPath, cityPath } from "@/lib/localities";
import { SITE_URL } from "@/lib/site";
import { waLink } from "@/lib/whatsapp";
import { sendTracked, unsubscribeUrl, isSuppressed } from "@/lib/emails/send";
import { day2Email, day5Email } from "@/lib/emails/templates";
import { snapshotOf, siteLinkFor } from "@/lib/leads/report";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily follow-up sequence for report-request leads (Task 2):
//   step 1 (report sent) --2 days--> Day 2 "Prices near [location]"   (step 2)
//   step 2              --5 days--> Day 5 "Free consultation"          (step 3, done)
// Each step is claimed with a conditional update before sending, so overlapping runs can never
// double-send. Opted-out / suppressed addresses are closed out without sending. Nearby prices
// come only from the engine cache (cacheOnly) -- this job never spends API credits.
const DAY = 86_400_000;
const BATCH = 50;

const TYPE_LABEL: Record<string, string> = { apartment: "apartment", villa: "villa", house: "independent house", plot: "plot", commercial: "commercial", agriculture: "farm land" };

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = Date.now();
  const due = await prisma.lead.findMany({
    where: {
      email: { not: null },
      marketingOptOut: false,
      sequenceStartedAt: { not: null },
      OR: [
        { sequenceStep: 1, sequenceStartedAt: { lte: new Date(now - 2 * DAY) } },
        { sequenceStep: 2, sequenceStartedAt: { lte: new Date(now - 5 * DAY) } },
      ],
    },
    orderBy: { sequenceStartedAt: "asc" },
    take: BATCH,
  });

  const results: { leadId: string; step: string; status: string }[] = [];
  for (const lead of due) {
    const next = lead.sequenceStep + 1;
    const claimed = await prisma.lead.updateMany({ where: { id: lead.id, sequenceStep: lead.sequenceStep }, data: { sequenceStep: next } });
    if (claimed.count === 0) continue;
    const email = lead.email!;
    if (await isSuppressed(email)) {
      await prisma.lead.update({ where: { id: lead.id }, data: { sequenceStep: 3 } });
      results.push({ leadId: lead.id, step: next === 2 ? "day2" : "day5", status: "skipped (unsubscribed)" });
      continue;
    }

    const ctx = (lead.reportContext ?? {}) as { location?: string; locationName?: string; propertyType?: string; tool?: string };
    const location = ctx.locationName || ctx.location || "your area";
    const propertyType = ctx.propertyType ?? "apartment";

    let mail: { subject: string; html: string };
    if (next === 2) {
      const loc = ctx.location ? matchLocality(ctx.location) : null;
      const neighbours = loc ? nearbyLocalities(loc, 5) : [];
      const nearby = await Promise.all(neighbours.map(async (n) => ({
        name: n.name,
        link: `${SITE_URL}${localityPath(n)}`,
        snapshot: snapshotOf(await getMarketPrice({ location: `${n.name}, ${n.city}`, propertyType, tool: "seo_page", cacheOnly: true, skipLog: true })),
      })));
      const cityLink = loc ? `${SITE_URL}${cityPath({ name: loc.city })}` : `${SITE_URL}/ai-intelligence`;
      mail = day2Email({
        name: lead.name, location, propertyLabel: TYPE_LABEL[propertyType] ?? propertyType,
        nearby, link: nearby.length ? cityLink : siteLinkFor(ctx.location ?? location),
        unsubscribeUrl: unsubscribeUrl(email),
      });
    } else {
      mail = day5Email({
        name: lead.name, location,
        whatsappLink: waLink(`Hi, I'd like a free consultation with PropKnown about ${location} ${TYPE_LABEL[propertyType] ?? ""} options.`.replace(/\s+/g, " ")),
        unsubscribeUrl: unsubscribeUrl(email),
      });
    }
    const r = await sendTracked({ to: email, subject: mail.subject, html: mail.html, kind: next === 2 ? "day2" : "day5", leadId: lead.id });
    if (!r.ok && r.status === "failed") {
      // Put the step back so tomorrow's run retries a transient failure.
      await prisma.lead.update({ where: { id: lead.id }, data: { sequenceStep: lead.sequenceStep } });
    }
    results.push({ leadId: lead.id, step: next === 2 ? "day2" : "day5", status: r.status });
  }

  return NextResponse.json({ processed: results.length, results });
}
