"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { masterApiSession } from "@/lib/adminGuard";
import { ALL_LOCALITIES } from "@/lib/localities";
import { logAudit } from "@/lib/auditLog";

const TYPES = ["apartment", "villa", "house", "plot", "commercial", "agriculture"];
const UNITS = ["sqft", "sqyard", "acres"];

export interface GuidanceFormState { ok: boolean; message: string }

// Adds one hand-entered official rate, or (with an "id" field) corrects an existing one. A new
// revision of a rate should be a new row with its own effective date (the newest one is shown);
// edit is for fixing a typo in a row. Every change is written to the audit log.
export async function addGuidanceRate(_prev: GuidanceFormState, form: FormData): Promise<GuidanceFormState> {
  const session = await masterApiSession();
  if (!session) return { ok: false, message: "Only the master admin can add official rates." };

  const s = (k: string) => String(form.get(k) ?? "").trim();
  const loc = ALL_LOCALITIES.find((l) => `${l.citySlug}/${l.slug}` === s("localityKey"));
  const rate = Number(s("ratePerUnit").replace(/,/g, ""));
  const effective = new Date(s("effectiveDate"));

  if (!loc) return { ok: false, message: "Pick the locality from the list." };
  if (!TYPES.includes(s("propertyType"))) return { ok: false, message: "Pick a property type." };
  if (!UNITS.includes(s("unit"))) return { ok: false, message: "Pick the unit the rate is published in." };
  if (!(rate > 0)) return { ok: false, message: "Enter the published rate as a number." };
  if (!s("sourceName")) return { ok: false, message: "Enter where the rate was copied from." };
  if (Number.isNaN(effective.getTime())) return { ok: false, message: "Enter the date the rate took effect." };
  const sourceUrl = s("sourceUrl");
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) return { ok: false, message: "Source link must start with http(s)://" };

  const id = s("id");
  const data = {
      state: s("state") || "Telangana", district: s("district") || null, mandal: s("mandal") || null,
      locality: s("locality") || loc.name, localityKey: `${loc.citySlug}/${loc.slug}`,
      propertyType: s("propertyType"), unit: s("unit"), ratePerUnit: rate, currency: "INR",
      sourceName: s("sourceName"), sourceUrl: sourceUrl || null, effectiveDate: effective,
      notes: s("notes") || null, enteredBy: session.name,
  };
  const row = id
    ? await prisma.guidanceRate.update({ where: { id }, data })
    : await prisma.guidanceRate.create({ data });
  logAudit({ actorId: session.userId, actorName: session.name, action: id ? "guidance_rate.edit" : "guidance_rate.add", entity: "GuidanceRate", entityId: row.id, details: { localityKey: row.localityKey, propertyType: row.propertyType, rate } }).catch(() => null);
  revalidatePath("/admin/automation/guidance-rates");
  return { ok: true, message: `Saved: ${loc.name} ${row.propertyType} ₹${rate.toLocaleString("en-IN")}/${row.unit}.` };
}
