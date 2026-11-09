import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySigned } from "@/lib/emails/send";
import { buildFairPricePdf, type FairPriceSnapshot } from "@/lib/reports/fairPricePdf";

// Signed download link for a Fair-Price Report. Re-renders the PDF from the snapshot stored on
// the lead when it was requested, so the download always matches the emailed copy.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const t = req.nextUrl.searchParams.get("t") ?? "";
  if (!verifySigned(`fpr:${params.id}`, t)) return NextResponse.json({ error: "Invalid link" }, { status: 403 });
  const lead = await prisma.lead.findUnique({ where: { id: params.id }, select: { reportContext: true } });
  const snapshot = (lead?.reportContext as { snapshot?: FairPriceSnapshot } | null)?.snapshot;
  if (!snapshot) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  const pdf = await buildFairPricePdf(snapshot);
  const file = `PropKnown-Fair-Price-Report-${snapshot.locationName.split(",")[0].replace(/[^A-Za-z0-9]+/g, "-")}.pdf`;
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
