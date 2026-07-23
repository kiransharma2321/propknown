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
  const builders = await prisma.builder.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ builders });
}

export async function POST(req: NextRequest) {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name, contact } = await req.json() as { name?: string; contact?: string };
  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  try {
    const builder = await prisma.builder.create({ data: { name: name.trim(), contact } });
    return NextResponse.json({ builder }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "A builder with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, ...data } = await req.json() as { id: string; name?: string; contact?: string; active?: boolean };
  const builder = await prisma.builder.update({ where: { id }, data });
  return NextResponse.json({ builder });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json() as { id: string };
  await prisma.builder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
