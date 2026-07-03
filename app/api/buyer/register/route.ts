import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/buyerAuth";

export async function POST(req: NextRequest) {
  const { name, email, phone, password } = await req.json() as {
    name: string; email: string; phone?: string; password: string;
  };

  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    return NextResponse.json({ error: "Name, email, and a password (6+ chars) are required" }, { status: 400 });
  }

  try {
    const buyer = await prisma.buyerUser.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        passwordHash: hashPassword(password),
      },
      select: { id: true, name: true, email: true },
    });

    const res = NextResponse.json({ ok: true, name: buyer.name, email: buyer.email }, { status: 201 });
    res.cookies.set("buyer_auth", `${buyer.id}:${Date.now()}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
