import { NextRequest, NextResponse } from "next/server";
import { FEATURES } from "@/lib/features";
import { getClientIp } from "@/lib/clientIp";
import { issueOtp, isEmail } from "@/lib/buyerOtp";
import { sendTracked } from "@/lib/emails/send";
import { otpEmail } from "@/lib/emails/accountTemplates";

// M2: email a one-time login code. The reply never says whether an account exists.
export async function POST(req: NextRequest) {
  if (!FEATURES.accountV2) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  if (!email || !isEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const r = await issueOtp(email, getClientIp(req));
  if (!r.ok) {
    return r.reason === "rate_limited"
      ? NextResponse.json({ error: "Too many codes requested. Please wait 15 minutes and try again." }, { status: 429 })
      : NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const { subject, html } = otpEmail(r.code);
  const sent = await sendTracked({ to: email, subject, html, kind: "buyer_otp" });
  if (!sent.ok) return NextResponse.json({ error: "We couldn't send the email. Please try again." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
