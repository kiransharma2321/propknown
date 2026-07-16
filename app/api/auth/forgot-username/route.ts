import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendUsernameRecoveryEmail } from "@/lib/email";

// Same generic response regardless of whether the email is registered -- see forgot-password
// for the full reasoning; this endpoint has the identical enumeration concern.
function genericResponse() {
  return NextResponse.json({
    message: "If this email is registered, you'll receive an email with your username shortly.",
  });
}

export async function POST(req: NextRequest) {
  const { email } = await req.json() as { email?: string };
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return genericResponse();

  try {
    const user = await prisma.adminUser.findUnique({ where: { email: normalized } });
    if (!user || !user.isActive) {
      console.log(`[forgot-username] no active account for ${normalized} — returning generic response`);
      return genericResponse();
    }

    // The username IS the registered email in this system, so "recovering" it just re-sends
    // it to the address that's already proven to be theirs by receiving this email at all.
    const result = await sendUsernameRecoveryEmail(user.email, user.name);
    if (!result.ok) {
      console.error(`[forgot-username] email send failed for ${normalized}:`, result.error);
    }
  } catch (e) {
    console.error("[forgot-username] unexpected error:", e);
  }

  return genericResponse();
}
