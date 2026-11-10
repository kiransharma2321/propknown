import { createHash, createHmac, timingSafeEqual } from "crypto";

// Signed session cookies, shared by admin/CRM (lib/adminSession.ts) and customer accounts
// (lib/buyerAuth.ts). Each scope has its own key, so a token from one can never be used as the
// other.
//
// Cookie value: v1.<userId>.<issuedAtMs>.<expiresAtMs>.<signature>
// signature = HMAC-SHA256(key, "v1.<userId>.<iat>.<exp>.<pwTag>") where
//   key   = SHA-256("propknown-<scope>-session-v1:" + NEXTAUTH_SECRET)   (fails closed if unset)
//   pwTag = first 16 hex of SHA-256(user.passwordHash)
// Binding the signature to the password hash means a password change/reset logs out every
// existing session for that user, with no extra database column. Expiry is enforced server-side
// from the signed value, not just by the browser's cookie max-age.

export interface SessionUser { id: string; passwordHash: string }

export function makeSession(scope: string, ttlMs: number) {
  function key(): Buffer | null {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret || secret.length < 32) {
      console.error(`[${scope}-session] NEXTAUTH_SECRET missing or shorter than 32 characters; logins are disabled.`);
      return null;
    }
    return createHash("sha256").update(`propknown-${scope}-session-v1:${secret}`).digest();
  }
  const pwTag = (passwordHash: string) => createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
  const sign = (k: Buffer, payload: string) => createHmac("sha256", k).update(payload).digest("base64url");

  return {
    ttlMs,
    create(user: SessionUser, now = Date.now()): string | null {
      const k = key();
      if (!k) return null;
      const head = `v1.${user.id}.${now}.${now + ttlMs}`;
      return `${head}.${sign(k, `${head}.${pwTag(user.passwordHash)}`)}`;
    },
    // Step 1 (no database): parse and check expiry. Returns the user id to look up, or null.
    read(token: string | undefined, now = Date.now()): { userId: string; iat: number; exp: number } | null {
      if (!token) return null;
      const parts = token.split(".");
      if (parts.length !== 5 || parts[0] !== "v1") return null;
      const [, userId, iatS, expS] = parts;
      const iat = Number(iatS), exp = Number(expS);
      if (!userId || !Number.isFinite(iat) || !Number.isFinite(exp)) return null;
      if (exp <= now || iat > now + 60_000 || exp - iat > ttlMs) return null;
      return { userId, iat, exp };
    },
    // Step 2: verify the signature against the user's current password hash (constant-time).
    verify(token: string, user: SessionUser): boolean {
      const k = key();
      if (!k) return false;
      const parts = token.split(".");
      if (parts.length !== 5 || parts[1] !== user.id) return false;
      const expected = Buffer.from(sign(k, `${parts.slice(0, 4).join(".")}.${pwTag(user.passwordHash)}`));
      const given = Buffer.from(parts[4]);
      return expected.length === given.length && timingSafeEqual(expected, given);
    },
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      maxAge: ttlMs / 1000,
      path: "/",
    },
  };
}
