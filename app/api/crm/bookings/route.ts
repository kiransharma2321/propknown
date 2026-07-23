import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, canRole } from "@/lib/rbac";

// Booking Module (Section 7) -- basic record + status/timeline tonight. Deliberately no
// agreement generation, cancellation, or refund logic -- that's real financial workflow,
// excluded on purpose (see the plan).
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canRole(session.role, "bookings"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: { lead: { select: { id: true, name: true, phone: true } }, property: { select: { id: true, title: true } } },
  });
  return NextResponse.json({ bookings });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canRole(session.role, "bookings"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { leadId, propertyId, amount } = await req.json() as { leadId?: string; propertyId?: string; amount?: number };
  if (!leadId) return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  const booking = await prisma.booking.create({
    data: { leadId, propertyId, amount, timeline: [{ ts: new Date().toISOString(), text: "Booking initiated", by: session.name }] },
  });
  return NextResponse.json({ booking }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canRole(session.role, "bookings"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, status } = await req.json() as { id: string; status: string };
  const existing = await prisma.booking.findUnique({ where: { id }, select: { timeline: true } });
  const timeline = Array.isArray(existing?.timeline) ? existing.timeline : [];
  const booking = await prisma.booking.update({
    where: { id },
    data: { status, timeline: [...timeline, { ts: new Date().toISOString(), text: `Status → ${status}`, by: session.name }] },
  });
  return NextResponse.json({ booking });
}
