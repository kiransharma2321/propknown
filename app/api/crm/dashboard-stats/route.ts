import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, canRole } from "@/lib/rbac";

// Executive Dashboard (Section 1). Every number here is a real query against real tables --
// nothing is estimated or fabricated. Where a feature's source data doesn't exist yet (Site
// Visits, Bookings, Marketing ROI on a fresh install), the corresponding field comes back
// empty/zero/null and the frontend renders an honest "no data yet" state instead of inventing
// a number, per the non-negotiable brand requirement.
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canRole(session.role, "dashboard"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  const [
    todaysLeads, totalLeads, wonLeads,
    followUpsToday, pendingFollowUps,
    todaysSiteVisits, totalBookings,
    allLeadsForGrouping, campaigns,
  ] = await Promise.all([
    prisma.lead.count({ where: { createdAt: { gte: startOfToday, lt: endOfToday } } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "won" } }),
    prisma.lead.count({ where: { followUpDate: { gte: startOfToday, lt: endOfToday } } }),
    prisma.lead.count({ where: { followUpDate: { lt: startOfToday }, status: { notIn: ["won", "lost"] } } }),
    prisma.siteVisit.count({ where: { scheduledAt: { gte: startOfToday, lt: endOfToday } } }),
    prisma.booking.count(),
    prisma.lead.findMany({ select: { source: true, assignedTo: true, status: true, leadScore: true, leadValue: true } }),
    prisma.campaign.findMany({ where: { spend: { not: null } } }),
  ]);

  // Lead Sources -- real grouping from actual Lead.source values.
  const sourceCounts: Record<string, number> = {};
  for (const l of allLeadsForGrouping) sourceCounts[l.source] = (sourceCounts[l.source] ?? 0) + 1;

  // Hot/Warm/Cold -- only counts leads that have actually been AI-scored (leadScore set).
  // Unscored leads are reported separately, never guessed into a bucket.
  let hot = 0, warm = 0, cold = 0, unscored = 0;
  for (const l of allLeadsForGrouping) {
    if (l.leadScore == null) { unscored++; continue; }
    if (l.leadScore >= 70) hot++;
    else if (l.leadScore >= 40) warm++;
    else cold++;
  }

  // Employee Performance / Top Sales Executives -- grouped by the existing assignedTo field.
  // Empty if no leads have ever been assigned (assignedTo is free-text, set via the existing
  // lead PATCH -- this dashboard doesn't invent assignment data).
  const byAssignee: Record<string, { total: number; won: number; value: number }> = {};
  for (const l of allLeadsForGrouping) {
    if (!l.assignedTo) continue;
    byAssignee[l.assignedTo] ??= { total: 0, won: 0, value: 0 };
    byAssignee[l.assignedTo].total++;
    if (l.status === "won") { byAssignee[l.assignedTo].won++; byAssignee[l.assignedTo].value += l.leadValue ?? 0; }
  }
  const topExecutives = Object.entries(byAssignee)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.won - a.won || b.total - a.total)
    .slice(0, 5);

  // Marketing ROI -- only real campaigns with real manually-entered spend produce a number;
  // campaigns with no spend entered, or no campaigns at all, are excluded rather than divided
  // by zero or guessed.
  const campaignRoi = campaigns.map(c => {
    const attributedLeads = allLeadsForGrouping.filter(l => l.source === c.channel).length;
    return {
      name: c.name, channel: c.channel, spend: c.spend,
      leads: attributedLeads,
      cpl: attributedLeads > 0 && c.spend ? Math.round((c.spend / attributedLeads) * 100) / 100 : null,
    };
  });

  // Recent Activity -- most recently updated leads, real timeline entries.
  const recentLeads = await prisma.lead.findMany({
    orderBy: { updatedAt: "desc" }, take: 8,
    select: { id: true, name: true, status: true, source: true, updatedAt: true },
  });

  return NextResponse.json({
    todaysLeads, totalLeads, wonLeads,
    conversionPct: totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 1000) / 10 : null,
    followUpsToday, pendingFollowUps,
    todaysSiteVisits, totalBookings,
    leadSources: Object.entries(sourceCounts).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
    leadTemperature: { hot, warm, cold, unscored },
    topExecutives,
    campaignRoi,
    recentActivity: recentLeads,
  });
}
