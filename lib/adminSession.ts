import { createHash, createHmac, timingSafeEqual } from "crypto";

// Signed admin/CRM session cookie. Replaces the old unsigned `${userId}:${Date.now()}` value,
// which anyone who knew (or guessed) a user id could forge.
//
// Cookie value: v1.<userId>.<issuedAtMs>.<expiresAtMs>.<signature>
// signature = HMAC-SHA256(key, "v1.<userId>.<iat>.<exp>.<pwTag>") where
//   key   = SHA-256("propknown-admin-session-v1:" + NEXTAUTH_SECRET)   (fails closed if unset)
//   pwTag = first 16 hex of SHA-256(user.passwordHash)
// Binding the signature to the password hash means a password change/reset logs out every
// existing session for that user, with no extra database column. Expiry is enforced server-side
// from the signed value, not just by the browser's cookie max-age. Old-format cookies never
// verify, so deploying this logs everyone out once.

export const ADMIN_COOKIE = "rbac_auth";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function key(): Buffer | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    console.error("[admin-session] NEXTAUTH_SECRET missing or shorter than 32 characters; admin logins are disabled.");
    return null;
  }
  return createHash("sha256").update(`propknown-admin-session-v1:${secret}`).digest();
}

const pwTag = (passwordHash: string) => createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
const sign = (k: Buffer, payload: string) => createHmac("sha256", k).update(payload).digest("base64url");

export function createSessionToken(user: { id: string; passwordHash: string }, now = Date.now()): string | null {
  const k = key();
  if (!k) return null;
  const head = `v1.${user.id}.${now}.${now + SESSION_TTL_MS}`;
  return `${head}.${sign(k, `${head}.${pwTag(user.passwordHash)}`)}`;
}

// Step 1 (no database): parse and check expiry. Returns the user id to look up, or null.
export function readSessionToken(token: string | undefined, now = Date.now()): { userId: string; iat: number; exp: number } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== "v1") return null;
  const [, userId, iatS, expS] = parts;
  const iat = Number(iatS), exp = Number(expS);
  if (!userId || !Number.isFinite(iat) || !Number.isFinite(exp)) return null;
  if (exp <= now || iat > now + 60_000 || exp - iat > SESSION_TTL_MS) return null;
  return { userId, iat, exp };
}

// Step 2: verify the signature against the user's current password hash (constant-time).
export function verifySessionToken(token: string, user: { id: string; passwordHash: string }): boolean {
  const k = key();
  if (!k) return false;
  const parts = token.split(".");
  if (parts.length !== 5 || parts[1] !== user.id) return false;
  const expected = Buffer.from(sign(k, `${parts.slice(0, 4).join(".")}.${pwTag(user.passwordHash)}`));
  const given = Buffer.from(parts[4]);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: SESSION_TTL_MS / 1000,
  path: "/",
};
