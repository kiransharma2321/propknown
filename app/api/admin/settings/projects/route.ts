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
  const projects = await prisma.project.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name, builder, city } = await req.json() as { name?: string; builder?: string; city?: string };
  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const project = await prisma.project.create({ data: { name: name.trim(), builder, city } });
  return NextResponse.json({ project }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, ...data } = await req.json() as { id: string; name?: string; builder?: string; city?: string; active?: boolean };
  const project = await prisma.project.update({ where: { id }, data });
  return NextResponse.json({ project });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json() as { id: string };
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
