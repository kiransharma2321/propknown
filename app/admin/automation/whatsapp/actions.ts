"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { masterApiSession } from "@/lib/adminGuard";
import { FEATURES } from "@/lib/features";
import { sendManual } from "@/lib/whatsapp/automation";
import { fetchTemplateStatuses, submitTemplate } from "@/lib/whatsapp/cloud";
import { placeholderCount, validTemplateName } from "@/lib/whatsapp/rules";

// M12 admin actions (master only): manual reply, AI take-over, templates.
const PATH = "/admin/automation/whatsapp";
const s = (f: FormData, k: string, n = 200) => String(f.get(k) ?? "").trim().slice(0, n);

async function guard() {
  if (!FEATURES.whatsapp) throw new Error("WhatsApp is switched off");
  const session = await masterApiSession();
  if (!session) throw new Error("Master admin only");
  return session;
}

export async function replyAction(form: FormData) {
  const session = await guard();
  const phone = s(form, "phone", 20), text = s(form, "text", 4000);
  if (!phone || !text) return;
  // A manual reply means a person is handling this chat: KnownAI stops replying.
  await prisma.whatsAppContact.update({ where: { phone }, data: { humanTakeoverAt: new Date() } });
  await sendManual(phone, text, session.name);
  revalidatePath(PATH);
}

export async function takeoverAction(form: FormData) {
  await guard();
  const phone = s(form, "phone", 20);
  const takeOver = s(form, "mode", 10) === "human";
  await prisma.whatsAppContact.update({ where: { phone }, data: { humanTakeoverAt: takeOver ? new Date() : null } });
  revalidatePath(PATH);
}

export async function saveTemplateAction(form: FormData) {
  await guard();
  const name = s(form, "name", 100), body = s(form, "body", 1024), category = s(form, "category", 20), language = s(form, "language", 10) || "en";
  const example = s(form, "example", 500).split("|").map((x) => x.trim()).filter(Boolean);
  if (!validTemplateName(name) || !body || !["MARKETING", "UTILITY"].includes(category)) return;
  if (example.length < placeholderCount(body)) return; // Meta rejects templates without sample values
  await prisma.whatsAppTemplate.upsert({ where: { name }, create: { name, body, category, language, example }, update: { body, category, language, example, status: "draft", metaId: null, reason: null } });
  revalidatePath(PATH);
}

export async function submitTemplateAction(form: FormData) {
  await guard();
  const t = await prisma.whatsAppTemplate.findUnique({ where: { id: s(form, "id", 40) } });
  if (!t) return;
  const r = await submitTemplate({ name: t.name, language: t.language, category: t.category, body: t.body, example: (t.example as string[] | null) ?? [] });
  await prisma.whatsAppTemplate.update({ where: { id: t.id }, data: r.ok ? { status: r.status, metaId: r.metaId, submittedAt: new Date(), reason: null } : { reason: r.error } });
  revalidatePath(PATH);
}

export async function refreshTemplatesAction() {
  await guard();
  const list = await fetchTemplateStatuses();
  for (const t of list ?? []) await prisma.whatsAppTemplate.updateMany({ where: { name: t.name }, data: { status: t.status, reason: t.reason ?? null } });
  revalidatePath(PATH);
}
