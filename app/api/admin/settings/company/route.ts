import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, canRole } from "@/lib/rbac";

async function requireSettingsAccess() {
  const session = await getAdminSession();
  if (!session || !(await canRole(session.role, "settings_config"))) return null;
  return session;
}

export async function GET() {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const settings = await prisma.companySettings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json() as { companyName?: string; founderName?: string; whatsapp?: string; email?: string; address?: string };
  const settings = await prisma.companySettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...body },
    update: body,
  });
  return NextResponse.json({ settings });
}
