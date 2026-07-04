import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendAdminEmail, buildLeadHtml } from "@/lib/email";
import { notifyNewLead } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, message, source, propertyId } = body;
    if (!name || !phone) {
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

    const src = source ?? "website";

    // Email admin — logs message ID on success, logs error on failure, never throws
    sendAdminEmail({
      subject: `New Lead: ${name} via ${src}`,
      html: buildLeadHtml({ name, phone, email, message, source: src }),
    }).catch(() => null);

    // Bell notification
    notifyNewLead({ id: lead.id, name, source: src, phone }).catch(() => null);

    const waLink = `https://wa.me/91${phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${name}, thank you for your enquiry on PropKnown. How can we help you today?`)}`;
    return NextResponse.json({ success: true, id: lead.id, whatsappLink: waLink }, { status: 201 });
  } catch (err) {
    console.error("Lead API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
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
