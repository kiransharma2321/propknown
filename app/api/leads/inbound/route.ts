import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyNewLead } from "@/lib/notifications";

const WEBHOOK_SECRET = process.env.LEAD_WEBHOOK_SECRET ?? "";

export async function POST(req: NextRequest) {
  // Optional HMAC/secret check
  if (WEBHOOK_SECRET) {
    const authHeader = req.headers.get("x-webhook-secret") ?? req.headers.get("authorization") ?? "";
    const provided = authHeader.replace(/^Bearer\s+/i, "");
    if (provided !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const body = await req.json() as Record<string, unknown>;

    // Normalise payload — accept both flat and nested formats
    const name    = (body.name ?? body.full_name ?? body.lead_name ?? "") as string;
    const phone   = (body.phone ?? body.phone_number ?? body.mobile ?? "") as string;
    const email   = (body.email ?? body.email_address ?? null) as string | null;
    const message = (body.message ?? body.notes ?? body.comment ?? null) as string | null;
    const source  = (body.source ?? body.utm_source ?? body.platform ?? "webhook") as string;

    if (!name || !phone) {
      return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        name: String(name).trim(),
        phone: String(phone).trim(),
        email: email ? String(email).trim().toLowerCase() : undefined,
        message: message ? String(message).trim() : undefined,
        source: String(source).trim(),
        status: "new",
      },
    });

    notifyNewLead({ id: lead.id, name: lead.name, source: lead.source, phone: lead.phone }).catch(() => null);

    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
  } catch (e) {
    console.error("Inbound lead webhook error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Meta / Facebook Lead Ads verification endpoint
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN ?? WEBHOOK_SECRET;

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
