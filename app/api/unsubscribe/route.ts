import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyUnsubscribe, normaliseEmail } from "@/lib/emails/send";

// One-click unsubscribe. GET = the footer link (unsubscribes immediately, then shows a
// confirmation page); POST = RFC 8058 List-Unsubscribe-Post from mail clients. Either way the
// address goes on the suppression list and every lead with that address is opted out, which
// stops ALL future marketing emails (follow-up sequence + newsletter). Transactional mail the
// person explicitly requests (e.g. a new report) is unaffected.
export const dynamic = "force-dynamic";

async function unsubscribe(req: NextRequest): Promise<string | null> {
  const e = req.nextUrl.searchParams.get("e") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  let email: string;
  try { email = normaliseEmail(Buffer.from(e, "base64url").toString("utf8")); } catch { return null; }
  if (!email.includes("@") || !t || !verifyUnsubscribe(email, t)) return null;
  await prisma.emailSuppression.upsert({ where: { email }, create: { email }, update: {} });
  await prisma.lead.updateMany({ where: { email: { equals: email, mode: "insensitive" } }, data: { marketingOptOut: true } });
  return email;
}

export async function GET(req: NextRequest) {
  const email = await unsubscribe(req);
  const url = new URL("/unsubscribed", req.nextUrl.origin);
  if (!email) url.searchParams.set("error", "1");
  return NextResponse.redirect(url, 303);
}

export async function POST(req: NextRequest) {
  const email = await unsubscribe(req);
  return email ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Invalid link" }, { status: 400 });
}
