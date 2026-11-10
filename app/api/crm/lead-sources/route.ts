import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, canRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

// Leads by first-touch source (utm_source / medium, else referrer host, else "direct / unknown").
export async function GET() {
  const session = await getAdminSession();
  if (!session || !(await canRole(session.role, "campaigns"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const leads = await prisma.lead.findMany({ select: { utmSource: true, utmMedium: true, utmCampaign: true, referrer: true, status: true } });
  const rows = new Map<string, { source: string; medium: string; campaign: string; leads: number; won: number }>();
  for (const l of leads) {
    let host = "";
    try { host = l.referrer ? new URL(l.referrer).hostname.replace(/^www\./, "") : ""; } catch { host = ""; }
    const source = l.utmSource || (host ? `${host} (referral)` : "direct / unknown");
    const medium = l.utmMedium || (host ? "referral" : "—");
    const campaign = l.utmCampaign || "—";
    const key = `${source}|${medium}|${campaign}`;
    const r = rows.get(key) ?? { source, medium, campaign, leads: 0, won: 0 };
    r.leads++;
    if (/won|closed|booked/i.test(l.status)) r.won++;
    rows.set(key, r);
  }
  return NextResponse.json({ rows: Array.from(rows.values()).sort((a, b) => b.leads - a.leads), total: leads.length });
}
