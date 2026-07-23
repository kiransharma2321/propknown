import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

// Role/ROLE_LABELS now live in lib/roles.ts (no server-only imports there, so it's safe for
// client components too -- see app/admin/users/page.tsx). Re-exported here so every existing
// `import { ... } from "@/lib/rbac"` call site keeps working unchanged.
export type { Role } from "@/lib/roles";
export { ROLE_LABELS } from "@/lib/roles";
import type { Role } from "@/lib/roles";
import type { AreaKey } from "@/lib/permissionAreas";

// bcrypt, cost factor 12 -- replaces the previous single-round SHA-256+static-salt scheme,
// which was fast enough to brute-force offline and used the same "pepper" for every password.
const BCRYPT_ROUNDS = 12;

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, BCRYPT_ROUNDS);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

// Permission Matrix (Master-Admin-editable, replaces the old hardcoded ROLE_PERMISSIONS table).
// Master is hardcoded true unconditionally -- this is the "can't accidentally lock yourself out"
// guarantee, enforced here (not just in the UI/save-endpoint) so it holds even if the
// RolePermission table is empty, mid-seed, or has bad data. If no row exists for a given
// (role, area) pair -- e.g. a newly-added area that hasn't been seeded yet -- this fails OPEN
// (returns true), matching this codebase's real starting behavior: before this matrix existed,
// every one of these routes either had no check at all or defaulted every role to access. A
// missing row should never silently remove access nobody configured it to remove.
export async function canRole(role: Role, area: AreaKey): Promise<boolean> {
  if (role === "master") return true;
  const row = await prisma.rolePermission.findUnique({ where: { role_area: { role, area } } });
  return row ? row.allowed : true;
}

export async function getAdminSession(): Promise<{ role: "master" | Role; name: string; email?: string; userId?: string } | null> {
  try {
    const cookieStore = await cookies();

    const rbacToken = cookieStore.get("rbac_auth")?.value;
    if (!rbacToken) return null;

    const [userId] = rbacToken.split(":");
    const user = await prisma.adminUser.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) return null;

    return { role: user.role as Role, name: user.name, email: user.email, userId: user.id };
  } catch { return null; }
}
