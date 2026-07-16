import { createHash } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

// Deliberately separate from lib/rbac.ts's (now bcrypt) hashPassword: this used to re-export
// that function, but upgrading admin/CRM to bcrypt would have silently broken every existing
// buyer account's password (bcrypt hashes are non-deterministic, so the old equality check in
// the login route could never match again, and existing stored hashes are in this SHA-256
// format, not bcrypt's). Buyer accounts are a separate, unrelated system from admin/CRM login,
// out of scope for that change -- kept exactly as it was.
export function hashPassword(pw: string): string {
  return createHash("sha256").update(pw + (process.env.NEXTAUTH_SECRET ?? "pk-salt")).digest("hex");
}

export async function getBuyerSession(): Promise<{ id: string; name: string; email: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("buyer_auth")?.value;
    if (!token) return null;

    const [buyerId] = token.split(":");
    const buyer = await prisma.buyerUser.findUnique({
      where: { id: buyerId },
      select: { id: true, name: true, email: true },
    });
    return buyer;
  } catch {
    return null;
  }
}
