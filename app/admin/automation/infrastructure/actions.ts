"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { masterApiSession } from "@/lib/adminGuard";
import { logAudit } from "@/lib/auditLog";

// M7: add / update / remove a verified infrastructure entry (master only). A source URL and the
// date it was checked are required -- nothing goes on the site without them.
export type InfraState = { ok: boolean; message: string };
const KINDS = ["metro", "rail", "road", "airport", "it_park", "hospital", "school", "other"];
const STATUSES = ["announced", "approved", "under_construction", "completed"];

export async function saveInfra(_prev: InfraState, form: FormData): Promise<InfraState> {
  const session = await masterApiSession();
  if (!session) return { ok: false, message: "Only the master admin can add infrastructure." };
  const s = (k: string, n = 200) => String(form.get(k) ?? "").trim().slice(0, n);
  const id = s("id", 40);
  const data = {
    name: s("name"), kind: s("kind", 20), status: s("status", 30), citySlug: s("citySlug", 40).toLowerCase(),
    areaSlugs: s("areaSlugs", 500).toLowerCase().split(",").map((x) => x.trim().replace(/[^a-z0-9-]/g, "")).filter(Boolean).join(","),
    expected: s("expected", 40) || null, sourceName: s("sourceName"), sourceUrl: s("sourceUrl", 500), notes: s("notes", 1000) || null,
    verifiedAt: new Date(s("verifiedAt", 20)), verifiedBy: session.name,
  };
  if (!data.name || !KINDS.includes(data.kind) || !STATUSES.includes(data.status) || !data.citySlug || !data.areaSlugs) return { ok: false, message: "Name, type, status, city and at least one area are required." };
  if (!/^https:\/\/\S+\.\S+/.test(data.sourceUrl) || !data.sourceName) return { ok: false, message: "A source name and an https source link are required." };
  if (Number.isNaN(data.verifiedAt.getTime()) || data.verifiedAt.getTime() > Date.now() + 86_400_000) return { ok: false, message: "Enter the date you checked the source." };
  try {
    const row = id ? await prisma.infraProject.update({ where: { id }, data }) : await prisma.infraProject.create({ data });
    logAudit({ actorId: session.userId, actorName: session.name, action: id ? "infra.edit" : "infra.add", entity: "InfraProject", entityId: row.id, details: { name: row.name, source: row.sourceUrl } }).catch(() => null);
  } catch {
    return { ok: false, message: "Couldn't save (is the infrastructure table in the database yet?)." };
  }
  revalidatePath("/admin/automation/infrastructure");
  return { ok: true, message: "Saved." };
}

export async function deleteInfra(form: FormData): Promise<void> {
  const session = await masterApiSession();
  if (!session) return;
  const id = String(form.get("id") ?? "");
  if (!id) return;
  await prisma.infraProject.delete({ where: { id } }).catch(() => null);
  logAudit({ actorId: session.userId, actorName: session.name, action: "infra.remove", entity: "InfraProject", entityId: id, details: {} }).catch(() => null);
  revalidatePath("/admin/automation/infrastructure");
}
