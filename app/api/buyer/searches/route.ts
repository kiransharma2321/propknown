import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FEATURES } from "@/lib/features";
import { getBuyerSession } from "@/lib/buyerAuth";
import { SEARCH_KINDS as KINDS, validSearchPath as validPath } from "@/lib/savedSearch";

// M2: saved searches. A search is the page + query string to re-open (only our own search pages).
const MAX = 50;

const off = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const unauth = () => NextResponse.json({ error: "Please log in." }, { status: 401 });

export async function GET() {
  if (!FEATURES.accountV2) return off();
  const buyer = await getBuyerSession();
  if (!buyer) return unauth();
  const searches = await prisma.savedSearch.findMany({ where: { buyerId: buyer.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ searches });
}

export async function POST(req: NextRequest) {
  if (!FEATURES.accountV2) return off();
  const buyer = await getBuyerSession();
  if (!buyer) return unauth();
  const { name, kind, path } = (await req.json().catch(() => ({}))) as { name?: string; kind?: string; path?: string };
  if (!validPath(path) || !kind || !KINDS.includes(kind)) return NextResponse.json({ error: "This search can't be saved." }, { status: 400 });
  if ((await prisma.savedSearch.count({ where: { buyerId: buyer.id } })) >= MAX) return NextResponse.json({ error: `You can save up to ${MAX} searches.` }, { status: 400 });
  const search = await prisma.savedSearch.create({ data: { buyerId: buyer.id, kind, path, name: (name ?? "").trim().slice(0, 80) || "Saved search" } });
  return NextResponse.json({ search }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!FEATURES.accountV2) return off();
  const buyer = await getBuyerSession();
  if (!buyer) return unauth();
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.savedSearch.deleteMany({ where: { id, buyerId: buyer.id } });
  return NextResponse.json({ ok: true });
}
