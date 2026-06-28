import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const NOTIFY_TO = "raghupinnelli@gmail.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, html, from: fromOverride } = body;

    if (!subject || !html) {
      return NextResponse.json({ error: "subject and html are required" }, { status: 400 });
    }

    const result = await resend.emails.send({
      from: fromOverride ?? "PropKnown <onboarding@resend.dev>",
      to: to ?? NOTIFY_TO,
      subject,
      html,
    });

    return NextResponse.json({ success: true, id: result.data?.id });
  } catch (err: unknown) {
    console.error("Email error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
