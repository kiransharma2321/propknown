import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendAdminEmail, buildLeadHtml, buildRaghuNotifyWhatsAppLink } from "@/lib/email";
import { notifyNewLead } from "@/lib/notifications";
import { toIndianWaNumber } from "@/lib/phone";
import { getAdminSession } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, message, source, propertyId } = body;
    console.log(`[leads] Incoming submission — name:"${name}" phone:"${phone}" source:"${source ?? "website"}"`);
    if (!name || !phone) {
      console.warn("[leads] Rejected — missing name or phone");
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    // Lead.propertyId is a real foreign key into the Property table, but most listings on
    // the site are static demo data or PropertySubmission records (different ID space) --
    // passing one of those IDs straight through causes a foreign-key violation and a 500.
    // Only attach propertyId when it actually resolves to a Property row; otherwise fold the
    // reference into the message so admins still see which listing the enquiry was about.
    let validPropertyId: string | null = null;
    let finalMessage = message ?? null;
    if (propertyId) {
      try {
        const exists = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true } });
        if (exists) {
          validPropertyId = propertyId;
        } else {
          finalMessage = finalMessage ? `${finalMessage} [Listing ref: ${propertyId}]` : `[Listing ref: ${propertyId}]`;
        }
      } catch {
        finalMessage = finalMessage ? `${finalMessage} [Listing ref: ${propertyId}]` : `[Listing ref: ${propertyId}]`;
      }
    }

    const lead = await prisma.lead.create({
      data: { name, phone, email, message: finalMessage, source: source ?? "website", propertyId: validPropertyId },
    });
    console.log(`[leads] Lead created — id:${lead.id}`);

    const src = source ?? "website";

    // Step 1: admin email — sendAdminEmail logs per-recipient success/failure itself, never throws
    console.log(`[leads] Step 1/2: sending admin email for lead ${lead.id}...`);
    sendAdminEmail({
      subject: `New Lead: ${name} via ${src}`,
      html: buildLeadHtml({ name, phone, email, message, source: src }),
    }).catch((e) => console.error(`[leads] Admin email step threw for lead ${lead.id}:`, e));

    // Step 2: in-admin bell notification
    console.log(`[leads] Step 2/2: creating bell notification for lead ${lead.id}...`);
    notifyNewLead({ id: lead.id, name, source: src, phone })
      .then(() => console.log(`[leads] Bell notification created for lead ${lead.id}`))
      .catch((e) => console.error(`[leads] Bell notification FAILED for lead ${lead.id}:`, e));

    // wa.me links — one to message the lead directly, one to notify Raghu with the full
    // lead summary pre-filled (his own number, for logging/forwarding to whoever follows up)
    const waLink = `https://wa.me/${toIndianWaNumber(phone)}?text=${encodeURIComponent(`Hi ${name}, thank you for your enquiry on PropKnown. How can we help you today?`)}`;
    const notifyWaLink = buildRaghuNotifyWhatsAppLink({ name, phone, email, message, source: src });
    console.log(`[leads] Generated WhatsApp links for lead ${lead.id} (lead + Raghu-notify)`);

    return NextResponse.json({ success: true, id: lead.id, whatsappLink: waLink, notifyWhatsappLink: notifyWaLink }, { status: 201 });
  } catch (err) {
    console.error("[leads] Lead API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Lead data (names, phones, emails, enquiry messages) is real customer PII -- admin/CRM
// staff only. POST above stays unauthenticated on purpose (it's the public enquiry-form
// submission endpoint); GET is the one that must never be reachable without a session.
export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  try {
    const leads = await prisma.lead.findMany({
      where: status ? { status } : undefined,
      include: { property: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(leads);
  } catch (err) {
    console.error("Lead GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
