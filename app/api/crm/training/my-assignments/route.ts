import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, canRole } from "@/lib/rbac";

// Each logged-in employee's own assigned training items (Employee Training Tracker).
export async function GET() {
  const session = await getAdminSession();
  if (!session || !session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canRole(session.role, "training_view"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const assignments = await prisma.trainingAssignment.findMany({
    where: { assigneeId: session.userId },
    include: { trainingItem: true },
    orderBy: { assignedAt: "desc" },
  });
  return NextResponse.json({ assignments });
}
