import { NextResponse } from "next/server";
import { BUYER_COOKIE, buyerCookieOptions } from "@/lib/buyerAuth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(BUYER_COOKIE, "", { ...buyerCookieOptions, maxAge: 0 });
  return res;
}
