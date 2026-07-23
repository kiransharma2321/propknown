import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, canRole } from "@/lib/rbac";

// Mark a training assignment complete -- only the assignee themselves can mark their own
// assignment complete (not an admin marking it on their behalf, so completion genuinely
// reflects that the employee went through the material).
export async function PATCH(_req: Request, { params }: { params: { assignmentId: string } }) {
  const session = await getAdminSession();
  if (!session || !session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canRole(session.role, "training_view"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const assignment = await prisma.trainingAssignment.findUnique({ where: { id: params.assignmentId } });
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (assignment.assigneeId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.trainingAssignment.update({
    where: { id: params.assignmentId },
    data: { completed: true, completedAt: new Date() },
  });
  return NextResponse.json({ assignment: updated });
}
