import { createHash, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { makeSession } from "@/lib/signedSession";

// Customer ("My PropKnown") accounts -- separate from admin/CRM logins.
//
// Session: signed cookie (lib/signedSession.ts, scope "buyer", 30 days), replacing the old
// unsigned `${buyerId}:${Date.now()}` value that anyone knowing a customer id could forge.
//
// Passwords: bcrypt (cost 12). Accounts created before this change have the old single-round
// SHA-256 hash; verifyBuyerPassword() still accepts it and the login route then re-hashes the
// password with bcrypt, so every account upgrades itself on its next login.

export const BUYER_COOKIE = "buyer_auth";
const session = makeSession("buyer", 30 * 24 * 60 * 60 * 1000);
export const buyerCookieOptions = session.cookieOptions;
export const createBuyerToken = session.create;

const BCRYPT_ROUNDS = 12;
const legacyHash = (pw: string) => createHash("sha256").update(pw + (process.env.NEXTAUTH_SECRET ?? "pk-salt")).digest("hex");
const isBcrypt = (h: string) => /^\$2[aby]\$/.test(h);

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, BCRYPT_ROUNDS);
}

// { ok, upgrade }: upgrade = true when the stored hash is the legacy format and should be replaced.
export async function verifyBuyerPassword(pw: string, stored: string): Promise<{ ok: boolean; upgrade: boolean }> {
  if (isBcrypt(stored)) return { ok: await bcrypt.compare(pw, stored), upgrade: false };
  const a = Buffer.from(legacyHash(pw)), b = Buffer.from(stored);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  return { ok, upgrade: ok };
}

export async function getBuyerSession(): Promise<{ id: string; name: string; email: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(BUYER_COOKIE)?.value;
    const parsed = session.read(token);
    if (!token || !parsed) return null;

    const buyer = await prisma.buyerUser.findUnique({
      where: { id: parsed.userId },
      select: { id: true, name: true, email: true, passwordHash: true },
    });
    if (!buyer || !session.verify(token, buyer)) return null;
    return { id: buyer.id, name: buyer.name, email: buyer.email };
  } catch {
    return null;
  }
}
