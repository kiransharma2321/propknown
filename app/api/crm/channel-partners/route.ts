import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/rbac";

// Channel Partner Module (Section 9) -- registration + lead attribution tonight. No commission/
// payout calculation -- that's real financial logic, deliberately excluded (see the plan).
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const partners = await prisma.channelPartner.findMany({
    orderBy: { createdAt: "desc" },
    include: { leads: { select: { id: true } } },
  });
  return NextResponse.json({
    partners: partners.map(p => ({ ...p, leadCount: p.leads.length, leads: undefined })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, phone, email, company } = await req.json() as { name?: string; phone?: string; email?: string; company?: string };
  if (!name?.trim() || !phone?.trim()) return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
  const partner = await prisma.channelPartner.create({ data: { name: name.trim(), phone: phone.trim(), email, company } });
  return NextResponse.json({ partner }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, active } = await req.json() as { id: string; active: boolean };
  const partner = await prisma.channelPartner.update({ where: { id }, data: { active } });
  return NextResponse.json({ partner });
}
