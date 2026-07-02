import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/rbac";
import { cookies } from "next/headers";
import { ADMIN_CREDENTIALS } from "@/lib/credentials";

async function isMasterAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  // Legacy master admin cookie
  if (cookieStore.get("admin_auth")?.value === "true") return true;
  // RBAC master
  const rbacToken = cookieStore.get("rbac_auth")?.value;
  if (!rbacToken) return false;
  const [userId] = rbacToken.split(":");
  const user = await prisma.adminUser.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === "master";
}

export async function GET() {
  if (!(await isMasterAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = await prisma.adminUser.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  if (!(await isMasterAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { name, email, password, role } = await req.json() as { name: string; email: string; password: string; role: string };
  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email, password required" }, { status: 400 });
  }
  const validRoles = ["master", "manager", "agent"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  try {
    const user = await prisma.adminUser.create({
      data: { name, email: email.toLowerCase(), passwordHash: hashPassword(password), role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isMasterAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await req.json() as { id: string };
  await prisma.adminUser.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}

// RBAC login endpoint
export async function PATCH(req: NextRequest) {
  const { email, password } = await req.json() as { email: string; password: string };

  // Check legacy master admin
  if (email === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    const res = NextResponse.json({ ok: true, role: "master", name: "Raghu Kiran" });
    res.cookies.set("admin_auth", "true", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 60 * 60 * 8, path: "/" });
    return res;
  }

  const user = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive || user.passwordHash !== hashPassword(password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, role: user.role, name: user.name });
  res.cookies.set("rbac_auth", `${user.id}:${Date.now()}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 60 * 60 * 8, path: "/" });
  return res;
}
