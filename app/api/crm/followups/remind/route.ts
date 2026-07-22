import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/rbac";
import { sendAdminEmail, escapeHtml } from "@/lib/email";
import { sendWhatsApp, sendSms } from "@/lib/twilio";

// Follow-Up Management reminder send (Section 4 / Section I). Email is genuinely live today
// (reuses the existing Resend setup). WhatsApp/SMS call the real Twilio functions in
// lib/twilio.ts -- if Twilio isn't configured yet, they honestly return { ok: false,
// error: "not_configured" } and this route reports that back as-is, never a fake success.
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId, channel, message } = await req.json() as { leadId?: string; channel?: string; message?: string };
  if (!leadId || !channel) return NextResponse.json({ error: "leadId and channel are required" }, { status: 400 });

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const text = message?.trim() || `Hi ${lead.name}, following up on your enquiry with PropKnown. Let us know if you have any questions!`;
  let result: { ok: boolean; error?: string };

  if (channel === "email") {
    if (!lead.email) {
      result = { ok: false, error: "This lead has no email address on file" };
    } else {
      try {
        await sendAdminEmail({
          to: lead.email,
          subject: "Following up — PropKnown",
          html: `<div style="font-family:sans-serif;max-width:480px"><p>${escapeHtml(text)}</p><p style="color:#999;font-size:11px">PropKnown Infra Pvt Ltd · +91 70130 16003</p></div>`,
        });
        result = { ok: true };
      } catch (e) {
        result = { ok: false, error: e instanceof Error ? e.message : "Send failed" };
      }
    }
  } else if (channel === "whatsapp") {
    result = await sendWhatsApp(lead.phone, text);
  } else if (channel === "sms") {
    result = await sendSms(lead.phone, text);
  } else {
    return NextResponse.json({ error: "Unknown channel" }, { status: 400 });
  }

  if (result.ok) {
    const timeline = Array.isArray(lead.timeline) ? lead.timeline : [];
    await prisma.lead.update({
      where: { id: leadId },
      data: { timeline: [...timeline, { type: "reminder", channel, at: new Date().toISOString(), by: session.name }] },
    });
  }

  return NextResponse.json(result);
}
