import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BUYER_COOKIE, buyerCookieOptions, createBuyerToken, hashPassword, verifyBuyerPassword } from "@/lib/buyerAuth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json() as { email: string; password: string };

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  let buyer = await prisma.buyerUser.findUnique({ where: { email: email.trim().toLowerCase() } });
  const check = buyer ? await verifyBuyerPassword(password, buyer.passwordHash) : { ok: false, upgrade: false };
  if (!buyer || !check.ok) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  // Legacy SHA-256 hash: replace with bcrypt now that we know the password.
  if (check.upgrade) {
    buyer = await prisma.buyerUser.update({ where: { id: buyer.id }, data: { passwordHash: await hashPassword(password) } });
  }
  const token = createBuyerToken(buyer);
  if (!token) return NextResponse.json({ error: "Login is temporarily unavailable." }, { status: 503 });

  const res = NextResponse.json({ ok: true, name: buyer.name, email: buyer.email });
  res.cookies.set(BUYER_COOKIE, token, buyerCookieOptions);
  return res;
}
