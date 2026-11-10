import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FEATURES } from "@/lib/features";
import { verifyOtp } from "@/lib/buyerOtp";
import { BUYER_COOKIE, buyerCookieOptions, createBuyerToken } from "@/lib/buyerAuth";

const MESSAGES = {
  invalid: "That code isn't right. Check the latest email and try again.",
  expired: "That code has expired. Ask for a new one.",
  too_many_attempts: "Too many wrong tries. Ask for a new code.",
} as const;

// M2: log in (or sign up) with the emailed code. A new address gets an account with no password
// (it can only log in by code); either way the email is now verified.
export async function POST(req: NextRequest) {
  if (!FEATURES.accountV2) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { email, code, name } = (await req.json().catch(() => ({}))) as { email?: string; code?: string; name?: string };
  if (!email || !code) return NextResponse.json({ error: "Email and code are required." }, { status: 400 });

  const v = await verifyOtp(email, code);
  if (!v.ok) return NextResponse.json({ error: MESSAGES[v.reason] }, { status: 401 });

  const now = new Date();
  let buyer = await prisma.buyerUser.findUnique({ where: { email: v.email } });
  if (buyer) {
    if (!buyer.emailVerifiedAt) buyer = await prisma.buyerUser.update({ where: { id: buyer.id }, data: { emailVerifiedAt: now } });
  } else {
    buyer = await prisma.buyerUser.create({
      data: {
        email: v.email,
        name: (name ?? "").trim().slice(0, 80) || v.email.split("@")[0],
        // Not a usable password hash: code-only accounts can't log in with a password.
        passwordHash: `otp-only:${randomBytes(24).toString("hex")}`,
        emailVerifiedAt: now,
      },
    });
  }
  const token = createBuyerToken(buyer);
  if (!token) return NextResponse.json({ error: "Login is temporarily unavailable." }, { status: 503 });
  const res = NextResponse.json({ ok: true, name: buyer.name, email: buyer.email });
  res.cookies.set(BUYER_COOKIE, token, buyerCookieOptions);
  return res;
}
