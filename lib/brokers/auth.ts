import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { makeSession } from "@/lib/signedSession";

// Broker / channel-partner portal sessions: signed cookie (scope "broker", 30 days), bound to the
// broker's password hash like admin and buyer sessions. Passwords use bcrypt via lib/buyerAuth.
export const BROKER_COOKIE = "broker_auth";
const session = makeSession("broker", 30 * 24 * 60 * 60 * 1000);
export const brokerCookieOptions = session.cookieOptions;
export const createBrokerToken = session.create;

export async function getBrokerSession() {
  try {
    const token = (await cookies()).get(BROKER_COOKIE)?.value;
    const parsed = session.read(token);
    if (!token || !parsed) return null;
    const b = await prisma.broker.findUnique({ where: { id: parsed.userId } });
    if (!b || b.status === "suspended" || !session.verify(token, b)) return null;
    return { id: b.id, name: b.name, firm: b.firm, email: b.email, status: b.status };
  } catch { return null; }
}
