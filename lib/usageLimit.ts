import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getBuyerSession } from "@/lib/buyerAuth";

export const FREE_ANONYMOUS_CHECKS = 3;
const COOKIE_NAME = "pk_anon_usage";

export interface UsageStatus {
  allowed:    boolean;
  loggedIn:   boolean;
  used:       number;
  limit:      number;
  remaining:  number;
}

// Server-side gate for AI-cost tools (AI Intelligence, Price Reality Check). Logged-in
// buyers are always unlimited. Anonymous visitors get a real database-backed counter keyed
// by a random ID in an httpOnly cookie -- deliberately not a hard-to-bypass security wall
// (clearing cookies resets it), just reasonable friction, per the honesty-over-impressiveness
// standard used elsewhere on this site. Called once per check; only increments when the
// check is actually going to run (checkAndConsume), so a blocked attempt doesn't count twice.
export async function getUsageStatus(): Promise<UsageStatus> {
  const buyer = await getBuyerSession();
  if (buyer) {
    return { allowed: true, loggedIn: true, used: 0, limit: FREE_ANONYMOUS_CHECKS, remaining: FREE_ANONYMOUS_CHECKS };
  }

  const cookieStore = await cookies();
  const anonId = cookieStore.get(COOKIE_NAME)?.value;
  if (!anonId) {
    return { allowed: true, loggedIn: false, used: 0, limit: FREE_ANONYMOUS_CHECKS, remaining: FREE_ANONYMOUS_CHECKS };
  }

  const record = await prisma.anonymousUsage.findUnique({ where: { id: anonId } });
  const used = record?.count ?? 0;
  return {
    allowed:   used < FREE_ANONYMOUS_CHECKS,
    loggedIn:  false,
    used,
    limit:     FREE_ANONYMOUS_CHECKS,
    remaining: Math.max(0, FREE_ANONYMOUS_CHECKS - used),
  };
}

// Consumes one check (incrementing the counter) if the visitor is still under the limit.
// Sets the anonymous cookie on first use. Returns the status AFTER this attempt.
export async function checkAndConsume(): Promise<UsageStatus> {
  const buyer = await getBuyerSession();
  if (buyer) {
    return { allowed: true, loggedIn: true, used: 0, limit: FREE_ANONYMOUS_CHECKS, remaining: FREE_ANONYMOUS_CHECKS };
  }

  const cookieStore = await cookies();
  let anonId = cookieStore.get(COOKIE_NAME)?.value;
  if (!anonId) {
    anonId = randomUUID();
    cookieStore.set(COOKIE_NAME, anonId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });
  }

  const existing = await prisma.anonymousUsage.findUnique({ where: { id: anonId } });
  const usedSoFar = existing?.count ?? 0;

  if (usedSoFar >= FREE_ANONYMOUS_CHECKS) {
    return { allowed: false, loggedIn: false, used: usedSoFar, limit: FREE_ANONYMOUS_CHECKS, remaining: 0 };
  }

  const updated = await prisma.anonymousUsage.upsert({
    where:  { id: anonId },
    create: { id: anonId, count: 1 },
    update: { count: { increment: 1 } },
  });

  return {
    allowed:   true,
    loggedIn:  false,
    used:      updated.count,
    limit:     FREE_ANONYMOUS_CHECKS,
    remaining: Math.max(0, FREE_ANONYMOUS_CHECKS - updated.count),
  };
}
