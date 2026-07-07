import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getBuyerSession } from "@/lib/buyerAuth";

export const AI_INTEL_FREE_SEARCHES = 3;
const COOKIE_NAME = "pk_ai_intel_id";

export interface AiIntelGateStatus {
  allowed:              boolean;
  requiresRegistration: boolean;
  loggedIn:             boolean;
  registered:           boolean;
  used:                 number;
  limit:                number;
  remaining:            number;
}

async function readAnonId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

async function readOrCreateAnonId(): Promise<string> {
  const cookieStore = await cookies();
  let id = cookieStore.get(COOKIE_NAME)?.value;
  if (!id) {
    id = randomUUID();
    cookieStore.set(COOKIE_NAME, id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });
  }
  return id;
}

// Combines the cookie-keyed and IP-keyed counters into one status: registered on EITHER
// unlocks unlimited; otherwise the visitor is only "allowed" while BOTH counters are still
// under budget, so clearing cookies alone (or switching networks alone) doesn't grant a
// fresh set of free searches on its own.
function statusFrom(cookieUsed: number, cookieRegistered: boolean, ipUsed: number | null, ipRegistered: boolean): AiIntelGateStatus {
  const registered = cookieRegistered || ipRegistered;
  const effectiveUsed = ipUsed != null ? Math.max(cookieUsed, ipUsed) : cookieUsed;
  const allowed = registered || effectiveUsed < AI_INTEL_FREE_SEARCHES;
  return {
    allowed,
    requiresRegistration: !allowed,
    loggedIn: false,
    registered,
    used: effectiveUsed,
    limit: AI_INTEL_FREE_SEARCHES,
    remaining: Math.max(0, AI_INTEL_FREE_SEARCHES - effectiveUsed),
  };
}

// Read-only check -- called before a search actually runs. Logged-in buyers and visitors who
// already completed the lead-capture gate always pass. `ip` is optional (server components /
// callers without a NextRequest can omit it and fall back to cookie-only tracking).
export async function getGateStatus(ip?: string | null): Promise<AiIntelGateStatus> {
  const buyer = await getBuyerSession();
  if (buyer) {
    return { allowed: true, requiresRegistration: false, loggedIn: true, registered: true, used: 0, limit: AI_INTEL_FREE_SEARCHES, remaining: AI_INTEL_FREE_SEARCHES };
  }

  const id = await readAnonId();
  const [cookieRecord, ipRecord] = await Promise.all([
    id ? prisma.aiIntelUsage.findUnique({ where: { id } }) : null,
    ip ? prisma.aiIntelUsageByIp.findUnique({ where: { ip } }) : null,
  ]);

  return statusFrom(
    cookieRecord?.count ?? 0,
    cookieRecord?.registered ?? false,
    ip ? (ipRecord?.count ?? 0) : null,
    ipRecord?.registered ?? false,
  );
}

// Consumes one free search (incrementing both counters) if the visitor is still under the
// limit or already registered on either dimension. Mirrors lib/usageLimit.ts's checkAndConsume.
export async function consumeSearch(ip?: string | null): Promise<AiIntelGateStatus> {
  const buyer = await getBuyerSession();
  if (buyer) {
    return { allowed: true, requiresRegistration: false, loggedIn: true, registered: true, used: 0, limit: AI_INTEL_FREE_SEARCHES, remaining: AI_INTEL_FREE_SEARCHES };
  }

  const id = await readOrCreateAnonId();
  const [existingCookie, existingIp] = await Promise.all([
    prisma.aiIntelUsage.findUnique({ where: { id } }),
    ip ? prisma.aiIntelUsageByIp.findUnique({ where: { ip } }) : null,
  ]);

  const alreadyRegistered = (existingCookie?.registered ?? false) || (existingIp?.registered ?? false);
  if (alreadyRegistered) {
    return statusFrom(existingCookie?.count ?? 0, true, ip ? (existingIp?.count ?? 0) : null, true);
  }

  const cookieUsed = existingCookie?.count ?? 0;
  const ipUsed = ip ? (existingIp?.count ?? 0) : 0;
  if (cookieUsed >= AI_INTEL_FREE_SEARCHES || ipUsed >= AI_INTEL_FREE_SEARCHES) {
    return statusFrom(cookieUsed, false, ip ? ipUsed : null, false);
  }

  const [updatedCookie, updatedIp] = await Promise.all([
    prisma.aiIntelUsage.upsert({
      where:  { id },
      create: { id, count: 1 },
      update: { count: { increment: 1 } },
    }),
    ip
      ? prisma.aiIntelUsageByIp.upsert({
          where:  { ip },
          create: { ip, count: 1 },
          update: { count: { increment: 1 } },
        })
      : Promise.resolve(null),
  ]);

  return statusFrom(updatedCookie.count, false, ip ? (updatedIp?.count ?? 0) : null, false);
}

// Called once a visitor submits the lead-capture gate form -- grants unlimited searches
// for this visitor from now on (both cookie and IP records), regardless of how many free
// searches they'd used.
export async function markRegistered(ip?: string | null): Promise<void> {
  const id = await readOrCreateAnonId();
  await Promise.all([
    prisma.aiIntelUsage.upsert({
      where:  { id },
      create: { id, count: AI_INTEL_FREE_SEARCHES, registered: true },
      update: { registered: true },
    }),
    ip
      ? prisma.aiIntelUsageByIp.upsert({
          where:  { ip },
          create: { ip, count: AI_INTEL_FREE_SEARCHES, registered: true },
          update: { registered: true },
        })
      : Promise.resolve(null),
  ]);
}
