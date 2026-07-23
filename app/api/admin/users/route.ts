import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, ROLE_LABELS } from "@/lib/rbac";
import { cookies } from "next/headers";
import { logAudit } from "@/lib/auditLog";

async function isMasterAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const rbacToken = cookieStore.get("rbac_auth")?.value;
  if (!rbacToken) return false;
  const [userId] = rbacToken.split(":");
  const user = await prisma.adminUser.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === "master";
}

// Additive, logging-only -- does not change isMasterAdmin's own logic or the access check above.
async function getActorInfo(): Promise<{ id?: string; name?: string }> {
  const cookieStore = await cookies();
  const rbacToken = cookieStore.get("rbac_auth")?.value;
  if (!rbacToken) return {};
  const [userId] = rbacToken.split(":");
  const user = await prisma.adminUser.findUnique({ where: { id: userId }, select: { id: true, name: true } });
  return user ? { id: user.id, name: user.name } : {};
}

export async function GET() {
  if (!(await isMasterAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = await prisma.adminUser.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  if (!(await isMasterAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { name, email, password, role } = await req.json() as { name: string; email: string; password: string; role: string };
  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email, password required" }, { status: 400 });
  }
  // Was a hardcoded ["master","manager","agent"] array, duplicating lib/rbac.ts's Role type and
  // silently rejecting any role added there. Derives from ROLE_LABELS now so the two can't drift.
  const validRoles = Object.keys(ROLE_LABELS);
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  try {
    const user = await prisma.adminUser.create({
      data: { name, email: email.toLowerCase(), passwordHash: await hashPassword(password), role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    const actor = await getActorInfo();
    logAudit({ actorId: actor.id, actorName: actor.name, action: "user.create", entity: "AdminUser", entityId: user.id, details: { role } }).catch(() => null);
    return NextResponse.json(user, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isMasterAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await req.json() as { id: string };
  await prisma.adminUser.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
