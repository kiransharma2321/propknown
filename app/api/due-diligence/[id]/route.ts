import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FEATURES } from "@/lib/features";
import { getBuyerSession } from "@/lib/buyerAuth";

// M6: one Due Diligence Report, for the customer who requested it only.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!FEATURES.dueDiligence) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const buyer = await getBuyerSession();
  if (!buyer) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const lead = await prisma.lead.findFirst({ where: { id: params.id, email: { equals: buyer.email, mode: "insensitive" }, source: "Due diligence report" }, select: { reportContext: true } });
  const c = lead?.reportContext as { kind?: string } | null;
  if (!lead || c?.kind !== "due_diligence") return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead.reportContext);
}
