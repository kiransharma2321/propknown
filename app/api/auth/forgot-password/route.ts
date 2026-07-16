import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

const TOKEN_TTL_MS = 45 * 60 * 1000; // 45 minutes
const MAX_REQUESTS_PER_HOUR = 3; // per account, not per IP -- see note below

// Same generic response every time, regardless of whether the email is registered, whether
// the account is active, or whether the send itself succeeded -- an attacker probing emails
// must never be able to tell a registered admin/CRM account from an unregistered one. Actual
// failures (bad Resend key, send error, rate limit) are logged server-side, not surfaced here.
function genericResponse() {
  return NextResponse.json({
    message: "If this email is registered, you'll receive a password reset email shortly.",
  });
}

export async function POST(req: NextRequest) {
  const { email } = await req.json() as { email?: string };
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return genericResponse();

  try {
    const user = await prisma.adminUser.findUnique({ where: { email: normalized } });
    if (!user || !user.isActive) {
      console.log(`[forgot-password] no active account for ${normalized} — returning generic response`);
      return genericResponse();
    }

    // Rate-limit per account (not per IP): counts tokens issued in the last hour regardless of
    // use, so repeatedly hitting this endpoint for one account can't spam its inbox or burn
    // through the Resend quota.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await prisma.passwordResetToken.count({
      where: { userId: user.id, createdAt: { gte: oneHourAgo } },
    });
    if (recentCount >= MAX_REQUESTS_PER_HOUR) {
      console.warn(`[forgot-password] rate limit hit for ${normalized} (${recentCount} tokens in the last hour)`);
      return genericResponse();
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    });

    const resetLink = `https://www.propknown.com/reset-password?token=${rawToken}`;
    const result = await sendPasswordResetEmail(user.email, user.name, resetLink);
    if (!result.ok) {
      console.error(`[forgot-password] email send failed for ${normalized}:`, result.error);
    }
  } catch (e) {
    console.error("[forgot-password] unexpected error:", e);
  }

  return genericResponse();
}
