import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, canRole } from "@/lib/rbac";

// Scoped team-list lookup for the Training Tracker's assignment UI. Deliberately separate from
// /api/admin/users (which is master-only and covers full user management incl. create/delete) --
// this only exposes the minimal fields needed to pick assignees, gated at the same "settings"
// permission level already used by the Training pages themselves, so a non-master admin who can
// create training items can also actually assign them.
export async function GET() {
  const session = await getAdminSession();
  if (!session || !(await canRole(session.role, "training_admin"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.adminUser.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ users });
}
