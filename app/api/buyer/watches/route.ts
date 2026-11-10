import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FEATURES } from "@/lib/features";
import { getBuyerSession } from "@/lib/buyerAuth";
import { MAX_WATCHES, WATCH_KINDS, currentWatchPrice, normaliseWatch, watchKey, type WatchKind } from "@/lib/priceWatch";

// M2: price watchlist (areas and projects). The current cached price is stored on creation, so
// the daily job only alerts on a later, real move.
const off = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const unauth = () => NextResponse.json({ error: "Please log in." }, { status: 401 });

export async function GET() {
  if (!FEATURES.accountV2) return off();
  const buyer = await getBuyerSession();
  if (!buyer) return unauth();
  const watches = await prisma.priceWatch.findMany({ where: { buyerId: buyer.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ watches });
}

export async function POST(req: NextRequest) {
  if (!FEATURES.accountV2) return off();
  const buyer = await getBuyerSession();
  if (!buyer) return unauth();
  const b = (await req.json().catch(() => ({}))) as { kind?: string; location?: string; projectName?: string; propertyType?: string };
  if (!b.kind || !WATCH_KINDS.includes(b.kind as WatchKind) || !b.location?.trim() || (b.kind === "project" && !b.projectName?.trim())) {
    return NextResponse.json({ error: "Tell us the area (and project) to watch." }, { status: 400 });
  }
  const w = normaliseWatch({ kind: b.kind as WatchKind, location: b.location, projectName: b.projectName, propertyType: b.propertyType });
  const key = watchKey(w);
  const existing = await prisma.priceWatch.findUnique({ where: { buyerId_watchKey: { buyerId: buyer.id, watchKey: key } } });
  if (existing) {
    const watch = existing.active ? existing : await prisma.priceWatch.update({ where: { id: existing.id }, data: { active: true } });
    return NextResponse.json({ watch });
  }
  if ((await prisma.priceWatch.count({ where: { buyerId: buyer.id, active: true } })) >= MAX_WATCHES) {
    return NextResponse.json({ error: `You can watch up to ${MAX_WATCHES} items.` }, { status: 400 });
  }
  const now = await currentWatchPrice(w);
  const watch = await prisma.priceWatch.create({
    data: { buyerId: buyer.id, watchKey: key, ...w, lastPrice: now?.price ?? null, lastCapturedAt: now?.capturedAt ?? null },
  });
  return NextResponse.json({ watch }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!FEATURES.accountV2) return off();
  const buyer = await getBuyerSession();
  if (!buyer) return unauth();
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.priceWatch.deleteMany({ where: { id, buyerId: buyer.id } });
  return NextResponse.json({ ok: true });
}
