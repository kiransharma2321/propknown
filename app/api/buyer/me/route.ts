import { NextResponse } from "next/server";
import { getBuyerSession } from "@/lib/buyerAuth";

export async function GET() {
  const buyer = await getBuyerSession();
  if (!buyer) return NextResponse.json({ buyer: null }, { status: 200 });
  return NextResponse.json({ buyer });
}
