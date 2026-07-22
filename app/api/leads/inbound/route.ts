import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyNewLead } from "@/lib/notifications";
import { getCredentialFields } from "@/lib/apiCredentials";

const WEBHOOK_SECRET = process.env.LEAD_WEBHOOK_SECRET ?? "";

interface MetaLeadgenPayload {
  object?: string;
  entry?: { id: string; changes?: { field: string; value: { leadgen_id: string; page_id: string; form_id?: string } }[] }[];
}

// Meta's actual leadgen webhook only ever sends { leadgen_id, page_id, form_id, ... } -- never
// the real name/phone/email. Getting the real submitted data requires a separate authenticated
// Graph API call using the Page Access Token saved in Settings -> API Keys. This was previously
// assumed to already work off the flat-payload parsing below; it didn't -- Meta's shape is
// nested and metadata-only, so this branch is what actually makes the connection functional.
async function fetchAndCreateMetaLead(leadgenId: string): Promise<{ ok: boolean; leadId?: string; error?: string }> {
  const fields = await getCredentialFields("meta");
  if (!fields?.pageAccessToken) {
    return { ok: false, error: "No Meta Page Access Token configured in Settings" };
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${encodeURIComponent(fields.pageAccessToken)}`
  );
  const data = await res.json() as {
    field_data?: { name: string; values: string[] }[];
    error?: { message: string };
  };
  if (!res.ok || data.error || !data.field_data) {
    return { ok: false, error: data.error?.message ?? `Graph API returned ${res.status}` };
  }

  // Meta's own field names vary by form (advertiser-configured) -- match the common variants,
  // same tolerant approach as the flat-payload path below.
  const get = (...keys: string[]) => {
    for (const f of data.field_data!) {
      if (keys.includes(f.name.toLowerCase())) return f.values?.[0];
    }
    return undefined;
  };
  const name  = get("full_name", "name");
  const phone = get("phone_number", "phone");
  const email = get("email");

  if (!name || !phone) {
    return { ok: false, error: "Lead form did not include both name and phone fields" };
  }

  const lead = await prisma.lead.create({
    data: { name: String(name).trim(), phone: String(phone).trim(), email: email?.trim().toLowerCase(), source: "meta_lead_ads", status: "new" },
  });
  notifyNewLead({ id: lead.id, name: lead.name, source: lead.source, phone: lead.phone }).catch(() => null);
  return { ok: true, leadId: lead.id };
}

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
    const body = await req.json() as Record<string, unknown> & MetaLeadgenPayload;

    // Meta's real leadgen webhook shape: { object: "page", entry: [{ changes: [{ field: "leadgen", value: { leadgen_id } }] }] }
    if (body.object === "page" && Array.isArray(body.entry)) {
      const results: { ok: boolean; leadId?: string; error?: string }[] = [];
      for (const entry of body.entry) {
        for (const change of entry.changes ?? []) {
          if (change.field === "leadgen" && change.value?.leadgen_id) {
            results.push(await fetchAndCreateMetaLead(change.value.leadgen_id));
          }
        }
      }
      const anyFailed = results.some(r => !r.ok);
      if (results.length === 0) return NextResponse.json({ ok: true, note: "No leadgen changes in payload" });
      return NextResponse.json({ ok: !anyFailed, results }, { status: anyFailed ? 207 : 201 });
    }

    // Normalise payload — accept both flat and nested formats (generic/non-Meta webhook sources)
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
