import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FEATURES } from "@/lib/features";
import { getBuyerSession } from "@/lib/buyerAuth";
import { downloadUrl } from "@/lib/reports/fairPrice";

// M2: the customer's Fair-Price Reports (stored as report-request leads keyed by email). Only
// shown once the email is verified by a one-time code -- otherwise anyone could register with
// someone else's address and download their reports.
export async function GET() {
  if (!FEATURES.accountV2) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await getBuyerSession();
  if (!session) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const buyer = await prisma.buyerUser.findUnique({ where: { id: session.id }, select: { email: true, emailVerifiedAt: true } });
  if (!buyer?.emailVerifiedAt) return NextResponse.json({ verified: false, reports: [] });

  const leads = await prisma.lead.findMany({
    where: { email: { equals: buyer.email, mode: "insensitive" }, source: { not: "" } },
    orderBy: { createdAt: "desc" }, take: 100, select: { id: true, createdAt: true, reportContext: true },
  });
  const reports = leads
    .map((l) => ({ l, s: (l.reportContext as { snapshot?: { locationName?: string; propertyType?: string } } | null)?.snapshot }))
    .filter((x) => x.s?.locationName)
    .slice(0, 50)
    .map(({ l, s }) => ({ id: l.id, createdAt: l.createdAt, location: s!.locationName!, propertyType: s!.propertyType ?? null, url: downloadUrl(l.id) }));
  return NextResponse.json({ verified: true, reports });
}
