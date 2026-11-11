import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { createNotification } from "@/lib/notifications";
import { sendText, sendTemplate } from "./cloud";
import { aiMayReply, canMessage, classify, inWindow, normalisePhone, CONSENT_TEXT, type ContactState } from "./rules";

// M12 WhatsApp automations: consent logging, instant welcome, inbound handling (STOP/START,
// hand-off, hot-lead alert, KnownAI auto-reply with sources), and the CRM lead timeline.
// Callers check FEATURES.whatsapp first.

// Template names the automations use. They must be created in the Template manager and
// APPROVED by Meta before anything is sent; until then sends fail and are logged as failed.
export const TEMPLATES = { welcome: "lead_welcome", day2: "lead_followup_day2", day5: "lead_followup_day5" } as const;
const LANG = "en";

async function appendTimeline(leadId: string | null | undefined, entry: Record<string, string>) {
  if (!leadId) return;
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { timeline: true } }).catch(() => null);
  if (!lead) return;
  const timeline = Array.isArray(lead.timeline) ? lead.timeline : [];
  await prisma.lead.update({ where: { id: leadId }, data: { timeline: [...timeline, { ts: new Date().toISOString(), ...entry }] } }).catch(() => {});
}

const state = (c: { consentAt: Date | null; optedOutAt: Date | null; lastInboundAt: Date | null; humanTakeoverAt: Date | null; aiEnabled: boolean; followupStep: number; followupStartedAt: Date | null }): ContactState => c;

// Record a sent/failed outbound message (and on the lead timeline).
async function logOutbound(phone: string, leadId: string | null, r: { ok: true; id: string } | { ok: false; error: string }, m: { kind: string; body: string; templateName?: string; byAi?: boolean; sentBy?: string }) {
  await prisma.whatsAppMessage.create({ data: {
    phone, leadId, direction: "out", kind: m.kind, body: m.body, templateName: m.templateName ?? null, byAi: !!m.byAi, sentBy: m.sentBy ?? null,
    waMessageId: r.ok ? r.id : null, status: r.ok ? "sent" : "failed", error: r.ok ? null : r.error,
  } });
  await appendTimeline(leadId, { type: "whatsapp", text: `WhatsApp ${r.ok ? "sent" : "FAILED"}${m.byAi ? " (KnownAI)" : m.sentBy ? ` by ${m.sentBy}` : ""}: ${m.templateName ? `[template ${m.templateName}] ` : ""}${m.body.slice(0, 300)}${r.ok ? "" : ` -- ${r.error}`}` });
}

// Lead forms: the visitor ticked the WhatsApp consent box. Log exactly what they agreed to,
// when, and from where -- then send the approved welcome template.
export async function recordConsentAndWelcome(o: { leadId: string; phone: string; name: string; source: string; ip?: string | null }) {
  const phone = normalisePhone(o.phone);
  if (!phone) return { ok: false, error: "invalid phone" };
  const now = new Date();
  const c = await prisma.whatsAppContact.upsert({
    where: { phone },
    create: { phone, leadId: o.leadId, name: o.name, consentAt: now, consentSource: o.source, consentText: CONSENT_TEXT, consentIp: o.ip ?? null, followupStep: 1, followupStartedAt: now },
    update: { leadId: o.leadId, name: o.name, consentAt: now, consentSource: o.source, consentText: CONSENT_TEXT, consentIp: o.ip ?? null, followupStep: 1, followupStartedAt: now },
  });
  await appendTimeline(o.leadId, { type: "whatsapp", text: `WhatsApp consent given (${o.source}): "${CONSENT_TEXT}"` });
  if (!canMessage(state(c))) return { ok: false, error: "no consent" };
  const body = `Welcome template ${TEMPLATES.welcome} (name: ${o.name})`;
  const r = await sendTemplate(phone, TEMPLATES.welcome, LANG, [o.name.split(" ")[0] || "there"]);
  await logOutbound(phone, o.leadId, r, { kind: "template", body, templateName: TEMPLATES.welcome });
  return r;
}

// Manual reply from the admin inbox (inside 24 h: free text; outside: must use a template).
export async function sendManual(phone: string, text: string, by: string) {
  const c = await prisma.whatsAppContact.findUnique({ where: { phone } });
  if (!c) return { ok: false as const, error: "Unknown contact" };
  if (!inWindow(state(c))) return { ok: false as const, error: "Outside the 24-hour window -- WhatsApp only allows an approved template now." };
  const r = await sendText(phone, text);
  await logOutbound(phone, c.leadId, r, { kind: "text", body: text, sentBy: by });
  return r;
}

export async function sendFollowup(phone: string, step: "day2" | "day5") {
  const c = await prisma.whatsAppContact.findUnique({ where: { phone } });
  if (!c) return;
  const name = TEMPLATES[step];
  const r = await sendTemplate(phone, name, LANG, [(c.name ?? "").split(" ")[0] || "there"]);
  await logOutbound(phone, c.leadId, r, { kind: "template", body: `Follow-up template ${name}`, templateName: name });
  await prisma.whatsAppContact.update({ where: { phone }, data: { followupStep: step === "day2" ? 2 : 3 } });
}

// KnownAI answer through the site's own chat endpoint (same grounding + source rules as the
// website). Sources are appended as links; nothing is invented here.
async function knownAiReply(text: string): Promise<string | null> {
  const res = await fetch(`${SITE_URL}/api/jarvis`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text }), signal: AbortSignal.timeout(12_000) }).catch(() => null);
  if (!res?.ok) return null;
  const j = (await res.json().catch(() => null)) as { reply?: string; meta?: { sources?: { url: string }[] } } | null;
  if (!j?.reply) return null;
  const reply = j.reply.replace(/\*\*/g, "*");
  const src = (j.meta?.sources ?? []).slice(0, 3).map((s) => s.url);
  return `${reply}${src.length ? `\n\nSources:\n${src.join("\n")}` : ""}\n\n_KnownAI (automated). Reply HUMAN to talk to the PropKnown team._`;
}

const alertOwner = (title: string, body: string) => createNotification({ type: "whatsapp", title, body, link: "/admin/automation/whatsapp" });

// One inbound message from the webhook.
export async function handleInbound(m: { from: string; id: string; text: string; name?: string; kind: string }) {
  const phone = normalisePhone(m.from) ?? m.from;
  if (await prisma.whatsAppMessage.findUnique({ where: { waMessageId: m.id } })) return; // Meta retries
  const lead = await prisma.lead.findFirst({ where: { phone: { contains: phone.slice(-10) } }, orderBy: { createdAt: "desc" }, select: { id: true } }).catch(() => null);
  const now = new Date();
  const c = await prisma.whatsAppContact.upsert({
    where: { phone },
    create: { phone, leadId: lead?.id ?? null, name: m.name ?? null, lastInboundAt: now },
    update: { lastInboundAt: now, ...(m.name ? { name: m.name } : {}), ...(lead?.id ? { leadId: lead.id } : {}) },
  });
  await prisma.whatsAppMessage.create({ data: { phone, leadId: c.leadId, direction: "in", kind: m.kind, body: m.text, waMessageId: m.id, status: "received" } });
  await appendTimeline(c.leadId, { type: "whatsapp", text: `WhatsApp received: ${m.text.slice(0, 300)}` });

  const intent = classify(m.text);
  if (intent === "stop") {
    await prisma.whatsAppContact.update({ where: { phone }, data: { optedOutAt: now, followupStep: 0 } });
    await appendTimeline(c.leadId, { type: "whatsapp", text: "Opted out of WhatsApp (STOP)" });
    const r = await sendText(phone, "You're unsubscribed from PropKnown WhatsApp messages. Reply START to subscribe again.");
    await logOutbound(phone, c.leadId, r, { kind: "text", body: "Opt-out confirmation" });
    return;
  }
  if (intent === "start") {
    await prisma.whatsAppContact.update({ where: { phone }, data: { consentAt: now, consentSource: "whatsapp_start", consentText: "Replied START on WhatsApp", optedOutAt: null } });
    await appendTimeline(c.leadId, { type: "whatsapp", text: "Re-subscribed on WhatsApp (START)" });
    const r = await sendText(phone, "You're subscribed to PropKnown WhatsApp updates again. Reply STOP at any time.");
    await logOutbound(phone, c.leadId, r, { kind: "text", body: "Re-subscribe confirmation" });
    return;
  }
  if (intent === "human") {
    await prisma.whatsAppContact.update({ where: { phone }, data: { humanTakeoverAt: now } });
    await alertOwner(`WhatsApp: ${c.name ?? phone} wants a person`, m.text.slice(0, 200));
    const r = await sendText(phone, "Thanks -- a PropKnown team member will reply here shortly.");
    await logOutbound(phone, c.leadId, r, { kind: "text", body: "Hand-off acknowledgement" });
    return;
  }
  if (intent === "hot") {
    await alertOwner(`Hot WhatsApp lead: ${c.name ?? phone}`, m.text.slice(0, 200));
    await appendTimeline(c.leadId, { type: "whatsapp", text: "Marked HOT (site visit / booking / budget mentioned)" });
  }
  const fresh = await prisma.whatsAppContact.findUnique({ where: { phone } });
  if (!fresh || !aiMayReply(state(fresh))) return;
  const reply = await knownAiReply(m.text);
  if (!reply) { await alertOwner(`WhatsApp: KnownAI couldn't answer ${c.name ?? phone}`, m.text.slice(0, 200)); return; }
  const r = await sendText(phone, reply);
  await logOutbound(phone, c.leadId, r, { kind: "text", body: reply, byAi: true });
}

// Delivery receipts: sent -> delivered -> read (or failed).
export async function handleStatus(s: { id: string; status: string; timestamp?: string; error?: string }) {
  await prisma.whatsAppMessage.updateMany({ where: { waMessageId: s.id }, data: { status: s.status, statusAt: s.timestamp ? new Date(Number(s.timestamp) * 1000) : new Date(), ...(s.error ? { error: s.error.slice(0, 300) } : {}) } });
}
