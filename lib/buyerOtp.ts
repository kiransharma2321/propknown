import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";

// M2: one-time email codes for customer sign-up / login ("My PropKnown").
// - 6 digits, valid 10 minutes, 5 wrong attempts and it's dead.
// - Only HMAC(secret, email:code) is stored, never the code.
// - Rate limits: 3 codes per email per 15 minutes, 10 per IP per hour.

export const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const PER_EMAIL = { n: 3, ms: 15 * 60 * 1000 };
const PER_IP = { n: 10, ms: 60 * 60 * 1000 };

const normalise = (email: string) => email.trim().toLowerCase();
export const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && email.length <= 200;

function hashCode(email: string, code: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET must be set for login codes");
  return createHmac("sha256", `propknown-buyer-otp-v1:${secret}`).update(`${normalise(email)}:${code}`).digest("hex");
}

export type IssueResult = { ok: true; code: string } | { ok: false; reason: "rate_limited" | "invalid_email" };

export async function issueOtp(emailRaw: string, ip: string | null): Promise<IssueResult> {
  if (!isEmail(emailRaw)) return { ok: false, reason: "invalid_email" };
  const email = normalise(emailRaw);
  const now = Date.now();
  const [byEmail, byIp] = await Promise.all([
    prisma.buyerOtp.count({ where: { email, createdAt: { gt: new Date(now - PER_EMAIL.ms) } } }),
    ip ? prisma.buyerOtp.count({ where: { ip, createdAt: { gt: new Date(now - PER_IP.ms) } } }) : Promise.resolve(0),
  ]);
  if (byEmail >= PER_EMAIL.n || byIp >= PER_IP.n) return { ok: false, reason: "rate_limited" };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.buyerOtp.create({ data: { email, codeHash: hashCode(email, code), expiresAt: new Date(now + OTP_TTL_MS), ip } });
  return { ok: true, code };
}

export type VerifyResult = { ok: true; email: string } | { ok: false; reason: "invalid" | "expired" | "too_many_attempts" };

// Checks the newest unused code for this email. Each wrong guess counts against that code.
export async function verifyOtp(emailRaw: string, codeRaw: string): Promise<VerifyResult> {
  const email = normalise(emailRaw);
  const code = codeRaw.replace(/\D/g, "");
  const otp = await prisma.buyerOtp.findFirst({ where: { email, usedAt: null }, orderBy: { createdAt: "desc" } });
  if (!otp) return { ok: false, reason: "invalid" };
  if (otp.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (otp.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

  const a = Buffer.from(hashCode(email, code)), b = Buffer.from(otp.codeHash);
  const match = code.length === 6 && a.length === b.length && timingSafeEqual(a, b);
  if (!match) {
    await prisma.buyerOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, reason: "invalid" };
  }
  // Claim it atomically so the same code can't be used twice in parallel.
  const claimed = await prisma.buyerOtp.updateMany({ where: { id: otp.id, usedAt: null }, data: { usedAt: new Date() } });
  return claimed.count === 1 ? { ok: true, email } : { ok: false, reason: "invalid" };
}
