import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json() as { token?: string; newPassword?: string };

  if (!token) {
    return NextResponse.json({ error: "Missing reset token." }, { status: 400 });
  }
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  // The token itself already proves possession of the reset email, so an invalid/expired/used
  // token can be reported explicitly here -- unlike forgot-password/forgot-username, there's no
  // account-enumeration concern once the caller already holds a token.
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record) {
    return NextResponse.json({ error: "This reset link is invalid. Please request a new one." }, { status: 400 });
  }
  if (record.used) {
    return NextResponse.json({ error: "This reset link has already been used. Please request a new one." }, { status: 400 });
  }
  if (record.expiresAt < new Date()) {
    return NextResponse.json({ error: "This reset link has expired. Please request a new one." }, { status: 400 });
  }
  if (!record.user.isActive) {
    return NextResponse.json({ error: "This account is no longer active." }, { status: 400 });
  }

  const newHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.adminUser.update({ where: { id: record.userId }, data: { passwordHash: newHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
    // Invalidate any other outstanding tokens for this user too, so an old email link from
    // before this reset can't still be used to reach the account.
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, used: false, id: { not: record.id } },
      data: { used: true },
    }),
  ]);

  console.log(`[reset-password] password reset for ${record.user.email}`);
  return NextResponse.json({ success: true });
}
