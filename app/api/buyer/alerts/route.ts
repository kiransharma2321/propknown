import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getBuyerSession } from "@/lib/buyerAuth";

export async function GET() {
  const buyer = await getBuyerSession();
  if (!buyer) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const alerts = await prisma.alert.findMany({
    where: { buyerId: buyer.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ alerts });
}

export async function POST(req: NextRequest) {
  const buyer = await getBuyerSession();
  if (!buyer) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { city, propType, minBudget, maxBudget } = await req.json() as {
    city?: string; propType?: string; minBudget?: number; maxBudget?: number;
  };

  const alert = await prisma.alert.create({
    data: {
      buyerId: buyer.id,
      city: city?.trim() || null,
      propType: propType?.trim() || null,
      minBudget: minBudget ?? null,
      maxBudget: maxBudget ?? null,
    },
  });
  return NextResponse.json({ alert }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const buyer = await getBuyerSession();
  if (!buyer) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.alert.deleteMany({ where: { id, buyerId: buyer.id } });
  return NextResponse.json({ ok: true });
}
