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

function statusFrom(used: number, registered: boolean): AiIntelGateStatus {
  const allowed = registered || used < AI_INTEL_FREE_SEARCHES;
  return {
    allowed,
    requiresRegistration: !allowed,
    loggedIn: false,
    registered,
    used,
    limit: AI_INTEL_FREE_SEARCHES,
    remaining: Math.max(0, AI_INTEL_FREE_SEARCHES - used),
  };
}

// Read-only check -- called before a search actually runs. Logged-in buyers and visitors who
// already completed the lead-capture gate always pass.
export async function getGateStatus(): Promise<AiIntelGateStatus> {
  const buyer = await getBuyerSession();
  if (buyer) {
    return { allowed: true, requiresRegistration: false, loggedIn: true, registered: true, used: 0, limit: AI_INTEL_FREE_SEARCHES, remaining: AI_INTEL_FREE_SEARCHES };
  }

  const id = await readAnonId();
  if (!id) return statusFrom(0, false);

  const record = await prisma.aiIntelUsage.findUnique({ where: { id } });
  return statusFrom(record?.count ?? 0, record?.registered ?? false);
}

// Consumes one free search (incrementing the counter) if the visitor is still under the
// limit or already registered. Mirrors lib/usageLimit.ts's checkAndConsume.
export async function consumeSearch(): Promise<AiIntelGateStatus> {
  const buyer = await getBuyerSession();
  if (buyer) {
    return { allowed: true, requiresRegistration: false, loggedIn: true, registered: true, used: 0, limit: AI_INTEL_FREE_SEARCHES, remaining: AI_INTEL_FREE_SEARCHES };
  }

  const id = await readOrCreateAnonId();
  const existing = await prisma.aiIntelUsage.findUnique({ where: { id } });

  if (existing?.registered) {
    return statusFrom(existing.count, true);
  }

  const usedSoFar = existing?.count ?? 0;
  if (usedSoFar >= AI_INTEL_FREE_SEARCHES) {
    return statusFrom(usedSoFar, false);
  }

  const updated = await prisma.aiIntelUsage.upsert({
    where:  { id },
    create: { id, count: 1 },
    update: { count: { increment: 1 } },
  });

  return statusFrom(updated.count, false);
}

// Called once a visitor submits the lead-capture gate form -- grants unlimited searches
// for this visitor from now on, regardless of how many free searches they'd used.
export async function markRegistered(): Promise<void> {
  const id = await readOrCreateAnonId();
  await prisma.aiIntelUsage.upsert({
    where:  { id },
    create: { id, count: AI_INTEL_FREE_SEARCHES, registered: true },
    update: { registered: true },
  });
}
