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
  const leadSources = await prisma.leadSource.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ leadSources });
}

export async function POST(req: NextRequest) {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name } = await req.json() as { name?: string };
  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  try {
    const leadSource = await prisma.leadSource.create({ data: { name: name.trim() } });
    return NextResponse.json({ leadSource }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "A lead source with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, active } = await req.json() as { id: string; active: boolean };
  const leadSource = await prisma.leadSource.update({ where: { id }, data: { active } });
  return NextResponse.json({ leadSource });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json() as { id: string };
  await prisma.leadSource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
