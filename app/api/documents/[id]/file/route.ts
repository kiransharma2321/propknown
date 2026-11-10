import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FEATURES } from "@/lib/features";
import { getBuyerSession } from "@/lib/buyerAuth";

// M5: the owner downloads their own stored document. Never cached, never indexed.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!FEATURES.docChecker) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const buyer = await getBuyerSession();
  if (!buyer) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const d = await prisma.documentCheck.findFirst({ where: { id: params.id, buyerId: buyer.id }, select: { fileId: true, fileName: true } });
  const f = d ? await prisma.uploadedFile.findUnique({ where: { id: d.fileId }, select: { data: true, mimeType: true } }) : null;
  if (!d || !f) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const bytes = Buffer.from(f.data.replace(/^data:[^;]+;base64,/, ""), "base64");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": f.mimeType,
      "Content-Disposition": `attachment; filename="${d.fileName.replace(/[^\w.\- ]+/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
