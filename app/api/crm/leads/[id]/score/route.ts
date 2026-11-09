import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, canRole } from "@/lib/rbac";
import { logAudit } from "@/lib/auditLog";
import { scoreLead, HOT_LEAD_SCORE } from "@/lib/leadScore";
import { sendHotLeadAlert } from "@/lib/leads/report";

// AI Lead Scoring (Section 3). Manually triggered per lead ("Score this lead"). The scoring
// itself lives in lib/leadScore.ts so report-request leads can be scored automatically too.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canRole(session.role, "lead_detail"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const r = await scoreLead(params.id);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error === "Lead not found" ? 404 : 200 });

  // Became hot on re-scoring: one 🔥 HOT alert (no-op if this lead already had one).
  if (r.result.leadScore >= HOT_LEAD_SCORE) {
    await sendHotLeadAlert(params.id, `Re-scored in the CRM: AI lead score ${r.result.leadScore}/100.`).catch(() => null);
  }
  logAudit({ actorId: session.userId, actorName: session.name, action: "lead.ai_score", entity: "Lead", entityId: params.id, details: { leadScore: r.result.leadScore } }).catch(() => null);
  return NextResponse.json({ ok: true, ...r.result });
}
