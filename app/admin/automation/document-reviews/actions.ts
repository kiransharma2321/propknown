"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { masterApiSession } from "@/lib/adminGuard";
import { logAudit } from "@/lib/auditLog";

// M5 human review: the master admin marks an AI document reading as reviewed, with notes the
// customer will see in their vault.
export async function markReviewed(form: FormData): Promise<void> {
  const session = await masterApiSession();
  if (!session) throw new Error("Only the master admin can review documents.");
  const id = String(form.get("id") ?? "");
  const notes = String(form.get("notes") ?? "").trim().slice(0, 2000);
  if (!id || !notes) return;
  await prisma.documentCheck.update({ where: { id }, data: { reviewStatus: "reviewed", reviewNotes: notes, reviewedBy: session.name, reviewedAt: new Date() } });
  logAudit({ actorId: session.userId, actorName: session.name, action: "document.review", entity: "DocumentCheck", entityId: id, details: {} }).catch(() => null);
  revalidatePath("/admin/automation/document-reviews");
}
