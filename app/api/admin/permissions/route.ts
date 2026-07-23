import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/rbac";
import { AREA_KEYS } from "@/lib/permissionAreas";
import { logAudit } from "@/lib/auditLog";

const ROLES = [
  "master", "manager", "agent",
  "super_admin", "chairman", "managing_director", "ceo", "coo",
  "sales_manager", "sales_executive", "crm_executive", "hr", "marketing", "legal", "channel_partner",
];

// Permission Matrix -- Master Admin only. Deliberately checks session.role === "master" directly
// here instead of going through canRole()/the matrix itself: letting the matrix govern who can
// edit the matrix would let anyone granted a permission also grant themselves more, which is a
// real privilege-escalation hole, not a hypothetical one.
async function requireMaster() {
  const session = await getAdminSession();
  if (!session || session.role !== "master") return null;
  return session;
}

export async function GET() {
  if (!(await requireMaster())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await prisma.rolePermission.findMany();
  const byKey = new Map(rows.map(r => [`${r.role}:${r.area}`, r.allowed]));

  const matrix: Record<string, Record<string, boolean>> = {};
  for (const role of ROLES) {
    matrix[role] = {};
    for (const area of AREA_KEYS) {
      // Master always shows true regardless of stored rows -- matches canRole()'s hardcoded
      // guarantee exactly, so the grid never shows a state the backend wouldn't actually honor.
      // Any other (role, area) with no row yet fails open to true, same as canRole().
      matrix[role][area] = role === "master" ? true : (byKey.get(`${role}:${area}`) ?? true);
    }
  }

  return NextResponse.json({ roles: ROLES, areas: AREA_KEYS, matrix });
}

export async function POST(req: NextRequest) {
  const session = await requireMaster();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { updates } = await req.json() as { updates?: { role: string; area: string; allowed: boolean }[] };
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "updates is required" }, { status: 400 });
  }

  // Master's row is locked server-side too, not just disabled in the UI -- can't be bypassed
  // by calling this endpoint directly.
  const clean = updates.filter(u => u.role !== "master" && ROLES.includes(u.role) && AREA_KEYS.includes(u.area as never));
  if (clean.length === 0) return NextResponse.json({ error: "No valid updates" }, { status: 400 });

  await Promise.all(clean.map(u =>
    prisma.rolePermission.upsert({
      where: { role_area: { role: u.role, area: u.area } },
      create: { role: u.role, area: u.area, allowed: u.allowed },
      update: { allowed: u.allowed },
    })
  ));

  logAudit({
    actorId: session.userId, actorName: session.name, action: "permissions.update",
    entity: "RolePermission", details: { count: clean.length, changes: clean },
  }).catch(() => null);

  return NextResponse.json({ ok: true, updated: clean.length });
}
