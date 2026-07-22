import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, canRole } from "@/lib/rbac";

async function requireSettingsAccess() {
  const session = await getAdminSession();
  if (!session || !canRole(session.role, "settings")) return null;
  return session;
}

export async function GET() {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const templates = await prisma.emailTemplate.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name, subject, body: content } = await req.json() as { name?: string; subject?: string; body?: string };
  if (!name?.trim() || !subject?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "name, subject, and body are required" }, { status: 400 });
  }
  try {
    const template = await prisma.emailTemplate.create({ data: { name: name.trim(), subject: subject.trim(), body: content } });
    return NextResponse.json({ template }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "A template with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, subject, body: content } = await req.json() as { id: string; subject?: string; body?: string };
  const template = await prisma.emailTemplate.update({ where: { id }, data: { subject, body: content } });
  return NextResponse.json({ template });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json() as { id: string };
  await prisma.emailTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
