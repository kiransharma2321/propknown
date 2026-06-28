import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const NOTIFY_TO = "raghupinnelli@gmail.com";

async function sendLeadEmail(lead: {
  name: string; phone: string; email?: string;
  message?: string; source: string;
}) {
  try {
    const key = process.env.RESEND_API_KEY;
    if (!key || key === "ADD-YOUR-RESEND-KEY-HERE") return;

    const waLink = `https://wa.me/91${lead.phone.replace(/\D/g, "")}`;

    await resend.emails.send({
      from: "PropKnown CRM <onboarding@resend.dev>",
      to: NOTIFY_TO,
      subject: `New Lead: ${lead.name} via ${lead.source}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;background:#fff;border-radius:12px;border:1px solid #e5e5e5;overflow:hidden">
          <div style="background:#0a0a0a;padding:24px 28px">
            <span style="color:#C9A24B;font-size:22px;font-weight:800;letter-spacing:-0.5px">PROP</span>
            <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px">KNOWN</span>
            <p style="color:#999;font-size:12px;margin:4px 0 0">New Lead Alert</p>
          </div>
          <div style="padding:28px">
            <h2 style="margin:0 0 16px;color:#0a0a0a;font-size:18px">You have a new lead from <span style="color:#C9A24B">${lead.source}</span></h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr style="background:#f8f8f8">
                <td style="padding:10px 14px;border:1px solid #e5e5e5;font-weight:600;color:#555;width:110px">Name</td>
                <td style="padding:10px 14px;border:1px solid #e5e5e5;color:#0a0a0a;font-weight:600">${lead.name}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;border:1px solid #e5e5e5;font-weight:600;color:#555">Phone</td>
                <td style="padding:10px 14px;border:1px solid #e5e5e5;color:#0a0a0a">${lead.phone}</td>
              </tr>
              <tr style="background:#f8f8f8">
                <td style="padding:10px 14px;border:1px solid #e5e5e5;font-weight:600;color:#555">Email</td>
                <td style="padding:10px 14px;border:1px solid #e5e5e5;color:#0a0a0a">${lead.email ?? "—"}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;border:1px solid #e5e5e5;font-weight:600;color:#555">Source</td>
                <td style="padding:10px 14px;border:1px solid #e5e5e5;color:#0a0a0a">${lead.source}</td>
              </tr>
              <tr style="background:#f8f8f8">
                <td style="padding:10px 14px;border:1px solid #e5e5e5;font-weight:600;color:#555">Message</td>
                <td style="padding:10px 14px;border:1px solid #e5e5e5;color:#0a0a0a">${lead.message ?? "—"}</td>
              </tr>
            </table>
            <div style="margin-top:24px">
              <a href="${waLink}" style="display:inline-block;background:#25d366;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
                WhatsApp ${lead.name}
              </a>
            </div>
            <p style="color:#aaa;font-size:11px;margin-top:28px;border-top:1px solid #e5e5e5;padding-top:16px">
              PropKnown Infra Pvt Ltd · raghupinnelli@gmail.com · +91 97017 71333
            </p>
          </div>
        </div>
      `,
    });
  } catch (emailErr) {
    console.warn("Resend email failed (non-fatal):", emailErr);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, message, source, propertyId } = body;
    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }
    const lead = await prisma.lead.create({
      data: { name, phone, email, message, source: source ?? "website", propertyId: propertyId ?? null },
    });

    // Fire-and-forget email notification via Resend
    sendLeadEmail({ name, phone, email, message, source: source ?? "website" });

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
