"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { masterApiSession } from "@/lib/adminGuard";
import { logAudit } from "@/lib/auditLog";
import { CHECKLIST_ITEMS } from "@/lib/listings/checklist";
import { createDraft, createVentureDraft, fetchPageText, runPriceCheck, approveDraft, rejectDraft, DraftError } from "@/lib/listings/drafts";

export interface ActionState { ok: boolean; message: string }

async function session() {
  const s = await masterApiSession();
  if (!s) throw new DraftError("Only the master admin can do this.");
  return s;
}
const fail = (e: unknown): ActionState => ({ ok: false, message: e instanceof DraftError ? e.message : "Something went wrong — please try again." });

// Quick Add: pasted brochure text, or a link to read -> AI draft in the queue.
export async function quickAddDraft(_prev: ActionState, form: FormData): Promise<ActionState> {
  let id: string;
  try {
    const s = await session();
    const url = String(form.get("url") ?? "").trim();
    const text = String(form.get("text") ?? "").trim();
    if (!url && !text) return { ok: false, message: "Paste brochure text or a link." };
    const raw = url ? await fetchPageText(url) : text;
    const { draft, duplicate } = await createDraft(raw, {
      origin: url ? "quick_add_url" : "quick_add_text",
      sourceUrl: url || null, sourceName: url ? new URL(url).hostname.replace(/^www\./, "") : "Pasted text",
    });
    if (duplicate) return { ok: false, message: `Already in the queue: RERA ${draft.reraNumber} (“${draft.projectName}”).` };
    logAudit({ actorId: s.userId, actorName: s.name, action: "listing_draft.create", entity: "ListingDraft", entityId: draft.id }).catch(() => null);
    id = draft.id;
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin/approval-queue");
  redirect(`/admin/approval-queue/${id}`);
}

// Venture Quick Add (your own projects): typed fields + photos already uploaded -> draft, no AI.
export async function quickAddVenture(_prev: ActionState, form: FormData): Promise<ActionState> {
  let id: string;
  try {
    const s = await session();
    const t = (k: string, n = 300) => String(form.get(k) ?? "").trim().slice(0, n) || null;
    const n = (k: string) => { const v = Number(String(form.get(k) ?? "").replace(/,/g, "")); return v > 0 ? v : null; };
    const photoIds = String(form.get("photoIds") ?? "").split(",").map((x) => x.trim()).filter((x) => /^[a-z0-9]{10,40}$/i.test(x));
    const draft = await createVentureDraft({
      projectName: t("projectName") ?? "", builder: t("builder"), location: t("location") ?? "", city: t("city") ?? "", state: t("state"),
      propertyType: t("propertyType") ?? "plot", configuration: t("configuration"), sizeText: t("sizeText"), sizeSqft: n("sizeSqft"),
      projectStatus: t("projectStatus"), possessionDate: t("possessionDate"), approvalAuthority: t("approvalAuthority"), approvalNumber: t("approvalNumber", 80),
      price: n("price"), priceNote: t("priceNote"), description: t("description", 3000), photoIds,
    }, s.name);
    logAudit({ actorId: s.userId, actorName: s.name, action: "listing_draft.create", entity: "ListingDraft", entityId: draft.id }).catch(() => null);
    id = draft.id;
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin/approval-queue");
  redirect(`/admin/approval-queue/${id}`);
}

const FIELDS = ["projectName", "builder", "location", "city", "state", "propertyType", "configuration", "sizeText", "projectStatus", "possessionDate", "reraNumber", "description", "approvalAuthority", "approvalNumber", "priceNote"] as const;

export async function saveDraft(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const s = await session();
    const id = String(form.get("id"));
    const data: Record<string, unknown> = {};
    for (const f of FIELDS) {
      const v = String(form.get(f) ?? "").trim();
      data[f] = f === "projectName" ? (v || "Untitled project (edit me)") : (v || null);
    }
    if (data.reraNumber) data.reraNumber = String(data.reraNumber).toUpperCase();
    const num = (k: string) => { const v = Number(String(form.get(k) ?? "").replace(/,/g, "")); return v > 0 ? v : null; };
    data.sizeSqft = num("sizeSqft");
    const price = num("price");
    const current = await prisma.listingDraft.findUniqueOrThrow({ where: { id } });
    // A price may only be kept with the link and date it came from.
    const priceSourceUrl = String(form.get("priceSourceUrl") ?? "").trim() || null;
    if (price && !priceSourceUrl && !current.priceSourceUrl && current.origin !== "quick_add_text") {
      return { ok: false, message: "A price needs the source link it came from." };
    }
    data.price = price;
    data.priceSourceUrl = price ? (priceSourceUrl ?? current.priceSourceUrl) : null;
    data.priceSourceDate = price ? (price === current.price && current.priceSourceDate ? current.priceSourceDate : new Date()) : null;
    data.checklist = CHECKLIST_ITEMS.map((_, i) => form.get(`check${i}`) === "on");
    await prisma.listingDraft.update({ where: { id }, data });
    if (price !== current.price || data.sizeSqft !== current.sizeSqft || data.location !== current.location) await runPriceCheck(id).catch(() => null);
    logAudit({ actorId: s.userId, actorName: s.name, action: "listing_draft.edit", entity: "ListingDraft", entityId: id }).catch(() => null);
    revalidatePath(`/admin/approval-queue/${id}`);
    return { ok: true, message: "Saved." };
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") return { ok: false, message: "Another draft already has that RERA number." };
    return fail(e);
  }
}

export async function approve(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const s = await session();
    const id = String(form.get("id"));
    const p = await approveDraft(id, s.name);
    logAudit({ actorId: s.userId, actorName: s.name, action: "listing_draft.approve", entity: "ListingDraft", entityId: id, details: { propertyId: p.id } }).catch(() => null);
    revalidatePath("/admin/approval-queue"); revalidatePath("/buy");
    return { ok: true, message: "Approved and published on /buy with the Verified badge." };
  } catch (e) { return fail(e); }
}

export async function reject(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const s = await session();
    const id = String(form.get("id"));
    await rejectDraft(id, s.name, String(form.get("reason") ?? ""));
    logAudit({ actorId: s.userId, actorName: s.name, action: "listing_draft.reject", entity: "ListingDraft", entityId: id }).catch(() => null);
    revalidatePath("/admin/approval-queue");
    return { ok: true, message: "Rejected." };
  } catch (e) { return fail(e); }
}
