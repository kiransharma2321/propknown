import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, canRole } from "@/lib/rbac";

async function requireSettingsAccess() {
  const session = await getAdminSession();
  if (!session || !canRole(session.role, "settings")) return null;
  return session;
}

// Marketing (Section 10 / K). Real campaign records with manually-entered spend, so the
// Dashboard's cost-per-lead is always computed from real numbers, never estimated.
export async function GET() {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const campaigns = await prisma.campaign.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ campaigns });
}

export async function POST(req: NextRequest) {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name, channel, spend, startDate, endDate } = await req.json() as {
    name?: string; channel?: string; spend?: number; startDate?: string; endDate?: string;
  };
  if (!name?.trim() || !channel?.trim()) return NextResponse.json({ error: "name and channel are required" }, { status: 400 });
  const campaign = await prisma.campaign.create({
    data: {
      name: name.trim(), channel: channel.trim(), spend: spend ?? null,
      startDate: startDate ? new Date(startDate) : null, endDate: endDate ? new Date(endDate) : null,
    },
  });
  return NextResponse.json({ campaign }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, ...data } = await req.json() as { id: string; spend?: number; active?: boolean };
  const campaign = await prisma.campaign.update({ where: { id }, data });
  return NextResponse.json({ campaign });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json() as { id: string };
  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
