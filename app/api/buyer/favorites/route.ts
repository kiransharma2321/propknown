import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getBuyerSession } from "@/lib/buyerAuth";

export async function GET() {
  const buyer = await getBuyerSession();
  if (!buyer) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const favorites = await prisma.favorite.findMany({
    where: { buyerId: buyer.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ favorites });
}

export async function POST(req: NextRequest) {
  const buyer = await getBuyerSession();
  if (!buyer) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { listingId, title, priceDisplay, location, image } = await req.json() as {
    listingId: string; title: string; priceDisplay?: string; location?: string; image?: string;
  };
  if (!listingId || !title) {
    return NextResponse.json({ error: "listingId and title required" }, { status: 400 });
  }

  const favorite = await prisma.favorite.upsert({
    where: { buyerId_listingId: { buyerId: buyer.id, listingId } },
    create: { buyerId: buyer.id, listingId, title, priceDisplay, location, image },
    update: {},
  });
  return NextResponse.json({ favorite }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const buyer = await getBuyerSession();
  if (!buyer) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { listingId } = await req.json() as { listingId: string };
  if (!listingId) return NextResponse.json({ error: "listingId required" }, { status: 400 });

  await prisma.favorite.deleteMany({ where: { buyerId: buyer.id, listingId } });
  return NextResponse.json({ ok: true });
}
