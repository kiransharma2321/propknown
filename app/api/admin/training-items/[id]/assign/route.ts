import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, canRole } from "@/lib/rbac";
import { logAudit } from "@/lib/auditLog";

// Assign a training item to one or more employees (Section: Training Tracker).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session || !(await canRole(session.role, "training_admin"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { assigneeIds } = await req.json() as { assigneeIds?: string[] };
  if (!assigneeIds?.length) return NextResponse.json({ error: "assigneeIds is required" }, { status: 400 });

  const users = await prisma.adminUser.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true } });

  const created = await Promise.all(users.map(u =>
    prisma.trainingAssignment.upsert({
      where: { trainingItemId_assigneeId: { trainingItemId: params.id, assigneeId: u.id } },
      create: { trainingItemId: params.id, assigneeId: u.id, assigneeName: u.name },
      update: {},
    })
  ));

  logAudit({ actorId: session.userId, actorName: session.name, action: "training.assign", entity: "TrainingItem", entityId: params.id, details: { assignedTo: users.map(u => u.name) } }).catch(() => null);
  return NextResponse.json({ assignments: created }, { status: 201 });
}
