import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

// Admin-separation gate: any logged-out (or stale/deactivated-user) visitor hitting a protected
// /admin/* page gets bounced to the login form. Deliberately does NOT check role -- which areas
// a given role can reach past login is the Permission Matrix's job (canRole(), enforced per
// route/page), not this gate's. This can't live in app/admin/layout.tsx itself: that layout also
// wraps app/admin/page.tsx (the login form), which must stay reachable with no session, and Next
// gives layouts no pathname to tell the two apart. So it's called from a small layout.tsx in each
// protected /admin/* subdirectory instead (dashboard, users, settings, bulk-import, audit-log,
// training) -- everywhere except the login page itself.
export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) redirect("/admin");
  return session;
}
