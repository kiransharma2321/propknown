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
  const propertyTypes = await prisma.propertyTypeConfig.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ propertyTypes });
}

export async function POST(req: NextRequest) {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name } = await req.json() as { name?: string };
  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  try {
    const propertyType = await prisma.propertyTypeConfig.create({ data: { name: name.trim() } });
    return NextResponse.json({ propertyType }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "A property type with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, active } = await req.json() as { id: string; active: boolean };
  const propertyType = await prisma.propertyTypeConfig.update({ where: { id }, data: { active } });
  return NextResponse.json({ propertyType });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json() as { id: string };
  await prisma.propertyTypeConfig.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
