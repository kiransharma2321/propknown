import { makeSession } from "@/lib/signedSession";

// Signed admin/CRM session cookie (see lib/signedSession.ts for the format). Replaces the old
// unsigned `${userId}:${Date.now()}` value, which anyone who knew (or guessed) a user id could
// forge. Old-format cookies never verify.

export const ADMIN_COOKIE = "rbac_auth";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

const session = makeSession("admin", SESSION_TTL_MS);

export const createSessionToken = session.create;
export const readSessionToken = session.read;
export const verifySessionToken = session.verify;
export const sessionCookieOptions = session.cookieOptions;
