import { NextRequest, NextResponse } from "next/server";
import { ADMIN_CREDENTIALS, CRM_CREDENTIALS } from "@/lib/credentials";

export async function POST(req: NextRequest) {
  const { username, password, role } = await req.json();

  const creds = role === "admin" ? ADMIN_CREDENTIALS : CRM_CREDENTIALS;

  if (username === creds.username && password === creds.password) {
    const res = NextResponse.json({ success: true, role });
    res.cookies.set(`${role}_auth`, "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });
    return res;
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}

export async function DELETE(req: NextRequest) {
  const { role } = await req.json();
  const res = NextResponse.json({ success: true });
  res.cookies.delete(`${role}_auth`);
  return res;
}
