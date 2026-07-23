import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, canRole } from "@/lib/rbac";

// Audit Trail viewer (Section 14) -- read-only. Only shows what's actually been logged since
// this was wired in tonight (Settings/credential changes, AI scoring runs, new user creation);
// nothing before that exists, and this honestly shows an empty list rather than backfilling.
export async function GET() {
  const session = await getAdminSession();
  if (!session || !(await canRole(session.role, "audit_log"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ logs });
}
