import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FEATURES } from "@/lib/features";
import { masterApiSession } from "@/lib/adminGuard";
import { logAudit } from "@/lib/auditLog";
import { toCsv } from "@/lib/insights";

// M11: leads CSV for a period (master only, audit-logged; formula-safe CSV).
export async function GET(req: NextRequest) {
  if (!FEATURES.bi) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await masterApiSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 30));
  const leads = await prisma.lead.findMany({
    where: { createdAt: { gte: new Date(Date.now() - days * 86_400_000) } }, orderBy: { createdAt: "desc" },
    select: { createdAt: true, name: true, phone: true, email: true, source: true, status: true, utmSource: true, utmMedium: true, utmCampaign: true, landingPage: true, message: true },
  });
  logAudit({ actorId: session.userId, actorName: session.name, action: "leads.export", entity: "Lead", entityId: `${days}d`, details: { rows: leads.length } }).catch(() => null);
  return new NextResponse(toCsv(leads), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="propknown-leads-${days}d.csv"`, "Cache-Control": "private, no-store" },
  });
}
