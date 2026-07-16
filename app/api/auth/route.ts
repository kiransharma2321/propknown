import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/rbac";

// Single login for both /admin and /crm -- every AdminUser (master/manager/agent) can log in
// at either portal with the same email + password; what they can actually DO once in is
// governed by role permissions (see lib/rbac.ts), not by which page they logged in from.
// The frontend still labels the field "Username", but the value is the user's registered
// email -- that's what the forgot-password/forgot-username flows key off of.
export async function POST(req: NextRequest) {
  const { username, password } = await req.json() as { username?: string; password?: string; role?: string };

  if (!username?.trim() || !password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const user = await prisma.adminUser.findUnique({ where: { email: username.trim().toLowerCase() } });
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ success: true, role: user.role, name: user.name });
  res.cookies.set("rbac_auth", `${user.id}:${Date.now()}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("rbac_auth");
  return res;
}
