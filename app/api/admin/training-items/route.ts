import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, canRole } from "@/lib/rbac";
import { logAudit } from "@/lib/auditLog";

// Employee Training Tracker (new feature) -- admin authors training items as links (video/
// document/other) with a title and description. Simple by design: no quiz/certification system.
async function requireSettingsAccess() {
  const session = await getAdminSession();
  if (!session || !canRole(session.role, "settings")) return null;
  return session;
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await prisma.trainingItem.findMany({
    orderBy: { createdAt: "desc" },
    include: { assignments: { select: { id: true, assigneeId: true, completed: true } } },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await requireSettingsAccess();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { title, description, link, linkType } = await req.json() as { title?: string; description?: string; link?: string; linkType?: string };
  if (!title?.trim() || !link?.trim()) return NextResponse.json({ error: "title and link are required" }, { status: 400 });
  const item = await prisma.trainingItem.create({
    data: { title: title.trim(), description, link: link.trim(), linkType: linkType ?? "other", createdBy: session.name },
  });
  logAudit({ actorId: session.userId, actorName: session.name, action: "training.create", entity: "TrainingItem", entityId: item.id }).catch(() => null);
  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await requireSettingsAccess();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json() as { id: string };
  await prisma.trainingItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
