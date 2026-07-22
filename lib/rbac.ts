import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

// Role/ROLE_LABELS/ROLE_PERMISSIONS now live in lib/roles.ts (no server-only imports there, so
// it's safe for client components too -- see app/admin/users/page.tsx). Re-exported here so
// every existing `import { ... } from "@/lib/rbac"` call site keeps working unchanged.
export type { Role } from "@/lib/roles";
export { ROLE_LABELS, ROLE_PERMISSIONS } from "@/lib/roles";
import type { Role } from "@/lib/roles";
import { ROLE_PERMISSIONS } from "@/lib/roles";

// bcrypt, cost factor 12 -- replaces the previous single-round SHA-256+static-salt scheme,
// which was fast enough to brute-force offline and used the same "pepper" for every password.
const BCRYPT_ROUNDS = 12;

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, BCRYPT_ROUNDS);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export function canRole(role: Role, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms.includes("all") || perms.includes(permission);
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
