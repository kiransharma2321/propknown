"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { masterApiSession } from "@/lib/adminGuard";
import { logAudit } from "@/lib/auditLog";
import { marketingDrafts } from "@/lib/podcast/ai";
import { planEpisodes, episodeSlug } from "@/lib/podcast/planner";

export interface PodState { ok: boolean; message: string }
const fail = (e: unknown): PodState => ({ ok: false, message: e instanceof Error ? e.message : "Something went wrong." });
async function master() {
  const s = await masterApiSession();
  if (!s) throw new Error("Only the master admin can do this.");
  return s;
}
const refresh = (id?: string) => { revalidatePath("/admin/automation/podcast-studio"); if (id) revalidatePath(`/admin/automation/podcast-studio/${id}`); };

export async function suggestEpisodes(): Promise<PodState> {
  try {
    await master();
    const made = await planEpisodes();
    refresh();
    return made.length ? { ok: true, message: `Added ${made.length} episode ideas.` } : { ok: false, message: "No price movements or published news this week to plan from." };
  } catch (e) { return fail(e); }
}

export async function newEpisode(_p: PodState, form: FormData): Promise<PodState> {
  try {
    await master();
    const title = String(form.get("title") ?? "").trim() || "Untitled episode";
    const ep = await prisma.podcastEpisode.create({ data: { slug: episodeSlug(title), status: "draft", title } });
    refresh();
    return { ok: true, message: ep.id };
  } catch (e) { return fail(e); }
}

// Called by the Studio after the browser has uploaded the MP3 to Blob.
export async function attachAudio(id: string, audioUrl: string, audioBytes: number, durationSec: number | null): Promise<PodState> {
  try {
    await master();
    if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(audioUrl)) return { ok: false, message: "That isn't a Blob URL." };
    await prisma.podcastEpisode.update({ where: { id }, data: { audioUrl, audioBytes, durationSec, status: "draft" } });
    refresh(id);
    return { ok: true, message: "Audio saved." };
  } catch (e) { return fail(e); }
}

export async function saveEpisode(_p: PodState, form: FormData): Promise<PodState> {
  try {
    await master();
    const id = String(form.get("id"));
    const s = (k: string) => String(form.get(k) ?? "").trim();
    // Chapters: one per line, "mm:ss Title". Related links: "Label | /path".
    const chapters = s("chapters").split("\n").map((l) => l.trim().match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/)).filter(Boolean).map((m) => ({ start: m![1], title: m![2] }));
    const related = s("relatedLinks").split("\n").map((l) => l.trim().match(/^(.+?)\s*\|\s*(\/\S*|https?:\/\/\S+)$/)).filter(Boolean).map((m) => ({ label: m![1], href: m![2] }));
    await prisma.podcastEpisode.update({
      where: { id },
      data: {
        title: s("title") || "Untitled episode", description: s("description").slice(0, 200), showNotes: s("showNotes") || null,
        transcript: s("transcript") || null, guest: s("guest") || null, topic: s("topic") || null,
        chapters: chapters as unknown as Prisma.InputJsonValue, relatedLinks: related as unknown as Prisma.InputJsonValue,
      },
    });
    refresh(id);
    return { ok: true, message: "Saved." };
  } catch (e) { return fail(e); }
}

export async function publishEpisode(_p: PodState, form: FormData): Promise<PodState> {
  try {
    const sess = await master();
    const id = String(form.get("id"));
    const ep = await prisma.podcastEpisode.findUniqueOrThrow({ where: { id } });
    if (!ep.audioUrl) return { ok: false, message: "Upload the MP3 before publishing." };
    if (!ep.description.trim()) return { ok: false, message: "Add a description before publishing." };
    const social = await marketingDrafts(ep).catch(() => null);
    await prisma.podcastEpisode.update({
      where: { id },
      data: { status: "published", publishedAt: ep.publishedAt ?? new Date(), ...(social ? { socialDrafts: social as unknown as Prisma.InputJsonValue } : {}) },
    });
    revalidatePath("/podcast"); revalidatePath(`/podcast/${ep.slug}`); revalidatePath("/podcast/feed.xml");
    logAudit({ actorId: sess.userId, actorName: sess.name, action: "podcast.publish", entity: "PodcastEpisode", entityId: id }).catch(() => null);
    refresh(id);
    return { ok: true, message: `Published at /podcast/${ep.slug}.${social ? " Marketing drafts are below." : ""}` };
  } catch (e) { return fail(e); }
}

export async function saveShow(_p: PodState, form: FormData): Promise<PodState> {
  try {
    await master();
    const s = (k: string) => String(form.get(k) ?? "").trim();
    const data = {
      title: s("title") || "The PropKnown Podcast", description: s("description"),
      ownerName: s("ownerName") || "Pinnelli Raghukiran", ownerEmail: s("ownerEmail"), category: s("category") || "Business",
      ...(s("coverUrl") ? { coverUrl: s("coverUrl") } : {}),
    };
    await prisma.podcastShow.upsert({ where: { id: "show" }, create: { id: "show", ...data }, update: data });
    revalidatePath("/podcast/feed.xml"); refresh();
    return { ok: true, message: "Show settings saved." };
  } catch (e) { return fail(e); }
}
