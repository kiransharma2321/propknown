import { NextRequest, NextResponse } from "next/server";
import { FEATURES } from "@/lib/features";
import { verifySignature } from "@/lib/whatsapp/cloud";
import { handleInbound, handleStatus } from "@/lib/whatsapp/automation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// M12: Meta WhatsApp Cloud API webhook.
// GET  -- Meta's one-time verification (hub.verify_token must equal WHATSAPP_VERIFY_TOKEN).
// POST -- messages + delivery statuses, accepted only with a valid X-Hub-Signature-256.
export async function GET(req: NextRequest) {
  if (!FEATURES.whatsapp) return new NextResponse("Not found", { status: 404 });
  const q = req.nextUrl.searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (q.get("hub.mode") === "subscribe" && token && q.get("hub.verify_token") === token) return new NextResponse(q.get("hub.challenge") ?? "", { status: 200 });
  return new NextResponse("Forbidden", { status: 403 });
}

type Change = { value?: {
  contacts?: { wa_id: string; profile?: { name?: string } }[];
  messages?: { from: string; id: string; type: string; text?: { body: string }; button?: { text: string }; interactive?: { button_reply?: { title: string }; list_reply?: { title: string } } }[];
  statuses?: { id: string; status: string; timestamp?: string; errors?: { title?: string; message?: string }[] }[];
} };

export async function POST(req: NextRequest) {
  if (!FEATURES.whatsapp) return new NextResponse("Not found", { status: 404 });
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  let body: { entry?: { changes?: Change[] }[] };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }
  for (const entry of body.entry ?? []) for (const ch of entry.changes ?? []) {
    const v = ch.value ?? {};
    const names = new Map((v.contacts ?? []).map((c) => [c.wa_id, c.profile?.name]));
    for (const m of v.messages ?? []) {
      const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? `[${m.type} message]`;
      await handleInbound({ from: m.from, id: m.id, text, name: names.get(m.from), kind: m.type === "text" ? "text" : "other" })
        .catch((e) => console.error("[whatsapp] inbound failed", m.id, e instanceof Error ? e.message : e));
    }
    for (const s of v.statuses ?? []) {
      await handleStatus({ id: s.id, status: s.status, timestamp: s.timestamp, error: s.errors?.[0]?.message ?? s.errors?.[0]?.title })
        .catch((e) => console.error("[whatsapp] status failed", s.id, e instanceof Error ? e.message : e));
    }
  }
  return NextResponse.json({ ok: true }); // always 200 once signed, so Meta doesn't retry forever
}
