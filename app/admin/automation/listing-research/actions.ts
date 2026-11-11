"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { masterApiSession } from "@/lib/adminGuard";
import { FEATURES } from "@/lib/features";
import { runResearch } from "@/lib/research";
import { RESEARCH_CITIES, CATEGORIES, type ResearchCategory } from "@/lib/research/rules";

// Auto Listing Researcher admin actions (master only, flag NEXT_PUBLIC_FEATURE_LISTING_RESEARCHER).
async function guard() {
  if (!FEATURES.listingResearcher) throw new Error("Listing Researcher is switched off");
  const s = await masterApiSession();
  if (!s) throw new Error("Master admin only");
  return s;
}

export async function runNowAction(form: FormData) {
  const s = await guard();
  const city = String(form.get("city") ?? "");
  if (!(RESEARCH_CITIES as readonly string[]).includes(city)) return;
  const cats = CATEGORIES.map((c) => c.id).filter((id) => form.get(`cat_${id}`) === "on") as ResearchCategory[];
  if (!cats.length) return;
  await runResearch(city, cats, { trigger: "manual", by: s.name, perCategory: { apartment: 5, villa: 3, plot_layout: 3, farmland: 2, commercial: 2 } });
  revalidatePath("/admin/automation/listing-research");
  revalidatePath("/admin/approval-queue");
}

export async function outreachStatusAction(form: FormData) {
  await guard();
  const id = String(form.get("id") ?? ""), status = String(form.get("status") ?? "");
  if (!["open", "sent", "received", "declined", "done"].includes(status)) return;
  await prisma.outreachTask.update({ where: { id }, data: { status, notes: String(form.get("notes") ?? "").slice(0, 2000) || undefined } });
  revalidatePath("/admin/automation/listing-research");
}
