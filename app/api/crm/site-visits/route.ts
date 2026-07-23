import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/rbac";

// Site Visit Module (Section 6) -- basic scheduling/status/feedback tonight. No live GPS
// tracking (mapsLink is a plain Google Maps deep link, not a tracked device location) and no
// AI visit summary yet -- both deliberately deferred, see the plan.
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const siteVisits = await prisma.siteVisit.findMany({
    orderBy: { scheduledAt: "asc" },
    include: { lead: { select: { id: true, name: true, phone: true } }, property: { select: { id: true, title: true } } },
  });
  return NextResponse.json({ siteVisits });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { leadId, propertyId, scheduledAt, assignedTo, mapsLink } = await req.json() as {
    leadId?: string; propertyId?: string; scheduledAt?: string; assignedTo?: string; mapsLink?: string;
  };
  if (!leadId || !scheduledAt) return NextResponse.json({ error: "leadId and scheduledAt are required" }, { status: 400 });
  const siteVisit = await prisma.siteVisit.create({
    data: { leadId, propertyId, scheduledAt: new Date(scheduledAt), assignedTo, mapsLink },
  });
  return NextResponse.json({ siteVisit }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, status, feedback, rating } = await req.json() as { id: string; status?: string; feedback?: string; rating?: number };
  const siteVisit = await prisma.siteVisit.update({ where: { id }, data: { status, feedback, rating } });
  return NextResponse.json({ siteVisit });
}
