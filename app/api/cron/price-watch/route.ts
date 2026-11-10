import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCronAuthorized } from "@/lib/cron";
import { FEATURES } from "@/lib/features";
import { SITE_URL } from "@/lib/site";
import { areaPath, findAreaPage } from "@/lib/areaPages";
import { sendTracked, unsubscribeUrl } from "@/lib/emails/send";
import { priceWatchEmail } from "@/lib/emails/accountTemplates";
import { changePct, currentWatchPrice, shouldAlert, stopToken } from "@/lib/priceWatch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// M2 daily job: for every active watch, read the cached (sourced, dated) price -- never a paid
// call -- and email the customer when it moved >= 3% since the last figure they were told.
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function linkFor(w: { kind: string; location: string; projectName: string | null }): string {
  if (w.kind === "project" && w.projectName) return `${SITE_URL}/price-check?location=${encodeURIComponent(w.location)}&project=${encodeURIComponent(w.projectName)}#project`;
  const [area, city] = w.location.split(",").map((x) => x.trim());
  const page = city ? findAreaPage(slug(city), slug(area)) : null;
  return page ? `${SITE_URL}${areaPath(page)}` : `${SITE_URL}/ai-intelligence`;
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!FEATURES.accountV2) return NextResponse.json({ skipped: "feature off" });

  const watches = await prisma.priceWatch.findMany({ where: { active: true }, include: { buyer: { select: { email: true } } }, take: 500 });
  let checked = 0, alerted = 0, seeded = 0;
  for (const w of watches) {
    const now = await currentWatchPrice(w);
    checked++;
    if (!now) continue;
    if (!w.lastPrice) { // first sourced price since the watch was created: record it, no alert
      await prisma.priceWatch.update({ where: { id: w.id }, data: { lastPrice: now.price, lastCapturedAt: now.capturedAt } });
      seeded++;
      continue;
    }
    if (!shouldAlert({ price: w.lastPrice, capturedAt: w.lastCapturedAt }, now)) continue;
    const label = w.kind === "project" && w.projectName ? `${w.projectName}, ${w.location} (${w.propertyType})` : `${w.location} (${w.propertyType})`;
    const { subject, html } = priceWatchEmail({
      label, link: linkFor(w), prev: w.lastPrice, prevDate: w.lastCapturedAt, next: now.price, nextDate: now.capturedAt,
      pct: changePct(w.lastPrice, now.price), sources: now.sources, confidence: now.confidence,
      stopUrl: `${SITE_URL}/api/buyer/watches/stop?w=${w.id}&t=${stopToken(w.id)}`, unsubscribeUrl: unsubscribeUrl(w.buyer.email),
    });
    const r = await sendTracked({ to: w.buyer.email, subject, html, kind: "price_watch" });
    // Move the baseline whether or not the email went out, so a failure never repeats forever.
    await prisma.priceWatch.update({ where: { id: w.id }, data: { lastPrice: now.price, lastCapturedAt: now.capturedAt, ...(r.ok ? { lastNotifiedAt: new Date() } : {}) } });
    if (r.ok) alerted++;
  }
  return NextResponse.json({ checked, alerted, seeded });
}
