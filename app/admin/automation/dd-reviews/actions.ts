"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { masterApiSession } from "@/lib/adminGuard";
import { logAudit } from "@/lib/auditLog";
import { LEGAL_CHECKLIST_ITEMS } from "@/lib/legalShield";

// M6 human review: notes + legal checklist statuses, set by a person (never inferred).
export async function reviewDueDiligence(form: FormData): Promise<void> {
  const session = await masterApiSession();
  if (!session) throw new Error("Only the master admin can review reports.");
  const id = String(form.get("id") ?? "");
  const notes = String(form.get("notes") ?? "").trim().slice(0, 4000);
  if (!id || !notes) return;
  const lead = await prisma.lead.findUnique({ where: { id }, select: { reportContext: true } });
  const ctx = lead?.reportContext as Record<string, unknown> | null;
  if (!ctx || ctx.kind !== "due_diligence") return;
  const checklist: Record<string, string> = {};
  for (const item of LEGAL_CHECKLIST_ITEMS) {
    const v = String(form.get(`c_${item.key}`) ?? "pending");
    checklist[item.key] = ["verified", "pending", "na"].includes(v) ? v : "pending";
  }
  await prisma.lead.update({ where: { id }, data: { reportContext: { ...ctx, review: { by: session.name, at: new Date().toISOString(), notes, checklist } } as never } });
  logAudit({ actorId: session.userId, actorName: session.name, action: "due_diligence.review", entity: "Lead", entityId: id, details: {} }).catch(() => null);
  revalidatePath("/admin/automation/dd-reviews");
}
