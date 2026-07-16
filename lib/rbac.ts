import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export type Role = "master" | "manager" | "agent";

export const ROLE_LABELS: Record<Role, string> = {
  master:  "Master Admin",
  manager: "Manager",
  agent:   "Agent",
};

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  master:  ["all"],
  manager: ["leads", "submissions", "properties", "crm", "notifications", "bulk_import"],
  agent:   ["leads_assigned", "crm_assigned"],
};

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
