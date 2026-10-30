import { redirect } from "next/navigation";
import { getAdminSession, canRole } from "@/lib/rbac";
import type { AreaKey } from "@/lib/permissionAreas";

// Guards for the Growth & Automation admin pages (AI Demand, Sequences, Content Studio, Calls,
// Testimonials, Approval Queue). These pages see customer PII and can send email to every lead,
// so they're Master-only unless an existing permission area is named explicitly -- canRole()
// fails OPEN for areas without a matrix row, which is the wrong default here.

export async function requireMasterPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin");
  if (session.role !== "master") redirect("/admin/dashboard");
  return session;
}

export async function masterApiSession() {
  const session = await getAdminSession();
  return session?.role === "master" ? session : null;
}

export async function areaApiSession(area: AreaKey) {
  const session = await getAdminSession();
  if (!session) return null;
  return (await canRole(session.role, area)) ? session : null;
}
