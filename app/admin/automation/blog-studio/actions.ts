"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { masterApiSession } from "@/lib/adminGuard";
import { logAudit } from "@/lib/auditLog";
import { draftFromItem, draftMarketPulse, socialCaptions } from "@/lib/news/draft";
import { SITE_URL } from "@/lib/site";

export interface StudioState { ok: boolean; message: string }

async function master() {
  const s = await masterApiSession();
  if (!s) throw new Error("Only the master admin can do this.");
  return s;
}
const fail = (e: unknown): StudioState => ({ ok: false, message: e instanceof Error ? e.message : "Something went wrong." });

export async function savePost(_p: StudioState, form: FormData): Promise<StudioState> {
  try {
    await master();
    const id = String(form.get("id"));
    const s = (k: string) => String(form.get(k) ?? "").trim();
    if (!s("title") || !s("body")) return { ok: false, message: "Title and body are required." };
    await prisma.blogPost.update({ where: { id }, data: { title: s("title").slice(0, 140), excerpt: s("excerpt").slice(0, 280), body: s("body"), whatItMeans: s("whatItMeans") } });
    revalidatePath(`/admin/automation/blog-studio/${id}`);
    return { ok: true, message: "Saved." };
  } catch (e) { return fail(e); }
}

export async function regenerate(_p: StudioState, form: FormData): Promise<StudioState> {
  try {
    await master();
    const id = String(form.get("id"));
    const post = await prisma.blogPost.findUniqueOrThrow({ where: { id } });
    if (post.kind === "market_pulse") {
      if (!(await draftMarketPulse(id))) return { ok: false, message: "No price movements to write about right now." };
    } else {
      const item = await prisma.newsItem.findFirst({ where: { postId: id } });
      if (!item) return { ok: false, message: "The source item for this draft is gone." };
      if (!(await draftFromItem(item, id))) return { ok: false, message: "The source has too little detail for an article." };
    }
    revalidatePath(`/admin/automation/blog-studio/${id}`);
    return { ok: true, message: "Regenerated from the same source." };
  } catch (e) { return fail(e); }
}

// IndexNow: tells Bing/Yandex (and others) a URL changed. Only when INDEXNOW_KEY is set; the key
// file is served at /indexnow-key.txt.
async function pingIndexNow(url: string): Promise<string> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return "IndexNow skipped (INDEXNOW_KEY not set)";
  const r = await fetch(`https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${encodeURIComponent(key)}&keyLocation=${encodeURIComponent(`${SITE_URL}/indexnow-key.txt`)}`, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
  return r && r.status < 300 ? "IndexNow pinged" : `IndexNow ping failed (${r?.status ?? "network"})`;
}

export async function approvePublish(_p: StudioState, form: FormData): Promise<StudioState> {
  try {
    const s = await master();
    const id = String(form.get("id"));
    const post = await prisma.blogPost.findUniqueOrThrow({ where: { id } });
    if (post.status === "published") return { ok: false, message: "Already published." };
    const social = await socialCaptions(post);
    await prisma.blogPost.update({
      where: { id },
      data: { status: "published", publishedAt: new Date(), reviewedBy: s.name, ...(social ? { socialDrafts: social as unknown as Prisma.InputJsonValue } : {}) },
    });
    revalidatePath("/news"); revalidatePath(`/news/${post.slug}`); revalidatePath("/sitemap.xml");
    const ping = await pingIndexNow(`${SITE_URL}/news/${post.slug}`);
    logAudit({ actorId: s.userId, actorName: s.name, action: "blog.publish", entity: "BlogPost", entityId: id }).catch(() => null);
    revalidatePath(`/admin/automation/blog-studio/${id}`);
    return { ok: true, message: `Published at /news/${post.slug}. ${ping}.${social ? " Social captions drafted below." : ""}` };
  } catch (e) { return fail(e); }
}

export async function rejectPost(_p: StudioState, form: FormData): Promise<StudioState> {
  try {
    const s = await master();
    const id = String(form.get("id"));
    await prisma.blogPost.update({ where: { id }, data: { status: "rejected", rejectReason: String(form.get("reason") ?? "").slice(0, 300) || null, reviewedBy: s.name } });
    revalidatePath("/admin/automation/blog-studio");
    return { ok: true, message: "Rejected." };
  } catch (e) { return fail(e); }
}
