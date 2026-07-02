import { createHash } from "crypto";
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

export function hashPassword(pw: string): string {
  return createHash("sha256").update(pw + (process.env.NEXTAUTH_SECRET ?? "pk-salt")).digest("hex");
}

export function canRole(role: Role, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms.includes("all") || perms.includes(permission);
}

export async function getAdminSession(): Promise<{ role: "master" | Role; name: string; email?: string; userId?: string } | null> {
  try {
    const cookieStore = await cookies();

    // Legacy master admin check
    if (cookieStore.get("admin_auth")?.value === "true") {
      return { role: "master", name: "Raghu Kiran", email: "kiranpropservices@gmail.com" };
    }

    // RBAC user check
    const rbacToken = cookieStore.get("rbac_auth")?.value;
    if (!rbacToken) return null;

    const [userId] = rbacToken.split(":");
    const user = await prisma.adminUser.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) return null;

    return { role: user.role as Role, name: user.name, email: user.email, userId: user.id };
  } catch { return null; }
}
