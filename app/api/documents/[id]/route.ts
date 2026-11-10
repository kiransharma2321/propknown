import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FEATURES } from "@/lib/features";
import { getBuyerSession } from "@/lib/buyerAuth";

// M5: one document check (owner only), and "delete it now".
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!FEATURES.docChecker) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const buyer = await getBuyerSession();
  if (!buyer) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const d = await prisma.documentCheck.findFirst({
    where: { id: params.id, buyerId: buyer.id },
    select: { id: true, fileName: true, docType: true, status: true, result: true, error: true, reviewStatus: true, reviewNotes: true, reviewedAt: true, expiresAt: true, createdAt: true },
  });
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ document: d });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!FEATURES.docChecker) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const buyer = await getBuyerSession();
  if (!buyer) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const d = await prisma.documentCheck.findFirst({ where: { id: params.id, buyerId: buyer.id }, select: { id: true, fileId: true } });
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.$transaction([
    prisma.uploadedFile.deleteMany({ where: { id: d.fileId } }),
    prisma.documentCheck.delete({ where: { id: d.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
