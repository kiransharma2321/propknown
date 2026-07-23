import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, canRole } from "@/lib/rbac";

// Sales Champions Leaderboard (new feature). Viewable by any logged-in CRM user (not
// manager/admin-only) -- see the page component for the reasoning: this is meant to function
// as real team recognition/motivation, which only works if the team can actually see it.
// Ranking is computed live from real Lead data (status, assignedTo, leadValue) -- same source
// as the Executive Dashboard's "Top Sales Executives" card, just fuller here. If fewer than 2
// people have any assigned leads, there isn't enough data to meaningfully rank anyone -- the
// route reports that explicitly rather than producing a leaderboard of 1 (or 0).
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canRole(session.role, "leaderboard"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const leads = await prisma.lead.findMany({
    where: { assignedTo: { not: null } },
    select: { assignedTo: true, status: true, leadValue: true },
  });

  const byRep: Record<string, { totalLeads: number; won: number; value: number }> = {};
  for (const l of leads) {
    const rep = l.assignedTo!;
    byRep[rep] ??= { totalLeads: 0, won: 0, value: 0 };
    byRep[rep].totalLeads++;
    if (l.status === "won") { byRep[rep].won++; byRep[rep].value += l.leadValue ?? 0; }
  }

  const ranked = Object.entries(byRep)
    .map(([name, s]) => ({
      name, dealsWon: s.won, totalLeads: s.totalLeads, totalValue: s.value,
      conversionRate: s.totalLeads > 0 ? Math.round((s.won / s.totalLeads) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.dealsWon - a.dealsWon || b.totalValue - a.totalValue);

  // Honest threshold: fewer than 2 reps with assigned leads isn't a meaningful "leaderboard" --
  // report the real reason instead of ranking a single person or an empty list as if it were one.
  const enoughData = ranked.length >= 2;

  return NextResponse.json({ enoughData, repCount: ranked.length, leaderboard: enoughData ? ranked : [] });
}
