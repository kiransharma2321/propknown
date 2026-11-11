import { createHmac, timingSafeEqual } from "crypto";

// M12: Meta WhatsApp Cloud API client (graph.facebook.com) -- our own build, no BSP, no
// unofficial WhatsApp Web libraries. Configuration comes only from these env vars (never logged):
//   WHATSAPP_TOKEN                 permanent System User access token
//   WHATSAPP_PHONE_NUMBER_ID       the business phone number's id
//   WHATSAPP_BUSINESS_ACCOUNT_ID   WABA id (templates)
//   WHATSAPP_APP_SECRET            Meta app secret (webhook signatures)
//   WHATSAPP_VERIFY_TOKEN          any random string, also entered in Meta's webhook settings

const GRAPH = "https://graph.facebook.com/v21.0";

export function whatsappConfigured(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_BUSINESS_ACCOUNT_ID && process.env.WHATSAPP_APP_SECRET);
}

// Meta signs each webhook POST: X-Hub-Signature-256: sha256=<HMAC-SHA256(app secret, raw body)>.
export function verifySignature(rawBody: string, header: string | null, secret = process.env.WHATSAPP_APP_SECRET ?? ""): boolean {
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody, "utf8").digest("hex"));
  const given = Buffer.from(header.slice(7));
  return expected.length === given.length && timingSafeEqual(expected, given);
}

type SendResult = { ok: true; id: string } | { ok: false; error: string };

async function post(path: string, body: unknown): Promise<{ ok: boolean; json: Record<string, unknown> }> {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
  }).catch((e) => ({ ok: false, json: async () => ({ error: { message: String(e) } }) }) as unknown as Response);
  return { ok: res.ok, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

const errMsg = (j: Record<string, unknown>) => ((j.error as { message?: string } | undefined)?.message ?? "WhatsApp API error").slice(0, 300);

// Free-form text: only allowed inside the 24-hour window after the person last wrote to us.
export async function sendText(to: string, body: string): Promise<SendResult> {
  if (!whatsappConfigured()) return { ok: false, error: "WhatsApp is not configured" };
  const r = await post(`${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, { messaging_product: "whatsapp", to, type: "text", text: { body: body.slice(0, 4000), preview_url: true } });
  const id = (r.json.messages as { id: string }[] | undefined)?.[0]?.id;
  return r.ok && id ? { ok: true, id } : { ok: false, error: errMsg(r.json) };
}

// Approved template: the only way to start a conversation (or write after 24 hours).
export async function sendTemplate(to: string, name: string, language: string, params: string[] = []): Promise<SendResult> {
  if (!whatsappConfigured()) return { ok: false, error: "WhatsApp is not configured" };
  const r = await post(`${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    messaging_product: "whatsapp", to, type: "template",
    template: { name, language: { code: language }, components: params.length ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text: text.slice(0, 900) })) }] : [] },
  });
  const id = (r.json.messages as { id: string }[] | undefined)?.[0]?.id;
  return r.ok && id ? { ok: true, id } : { ok: false, error: errMsg(r.json) };
}

// Template management (Meta reviews each template; status comes back PENDING/APPROVED/REJECTED).
export async function submitTemplate(t: { name: string; language: string; category: string; body: string; example?: string[] }): Promise<{ ok: true; metaId: string; status: string } | { ok: false; error: string }> {
  if (!whatsappConfigured()) return { ok: false, error: "WhatsApp is not configured" };
  const r = await post(`${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`, {
    name: t.name, language: t.language, category: t.category,
    components: [{ type: "BODY", text: t.body, ...(t.example?.length ? { example: { body_text: [t.example] } } : {}) }],
  });
  return r.ok && r.json.id ? { ok: true, metaId: String(r.json.id), status: String(r.json.status ?? "PENDING") } : { ok: false, error: errMsg(r.json) };
}

export async function fetchTemplateStatuses(): Promise<{ name: string; status: string; reason?: string }[] | null> {
  if (!whatsappConfigured()) return null;
  const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates?fields=name,status,rejected_reason&limit=200`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }, signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!res?.ok) return null;
  const j = (await res.json()) as { data?: { name: string; status: string; rejected_reason?: string }[] };
  return (j.data ?? []).map((t) => ({ name: t.name, status: t.status, reason: t.rejected_reason }));
}
