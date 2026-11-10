import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FEATURES } from "@/lib/features";
import { getBuyerSession } from "@/lib/buyerAuth";
import { ATTRIBUTION_COOKIE, leadAttribution } from "@/lib/attribution";
import { notifyNewLead } from "@/lib/notifications";
import { sendLeadAlert } from "@/lib/leads/report";
import { buildDueDiligence, type DDReport } from "@/lib/dueDiligence";

export const maxDuration = 60;
const SOURCE = "Due diligence report";

// M6: create a preliminary Due Diligence Report (stored on a lead so the sales team sees the
// request in the CRM) and list the customer's own reports.
export async function GET() {
  if (!FEATURES.dueDiligence) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const buyer = await getBuyerSession();
  if (!buyer) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const leads = await prisma.lead.findMany({ where: { email: { equals: buyer.email, mode: "insensitive" }, source: SOURCE }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, createdAt: true, reportContext: true } });
  return NextResponse.json({
    reports: leads.map((l) => {
      const c = l.reportContext as { report?: DDReport; review?: { at: string } | null } | null;
      return { id: l.id, createdAt: l.createdAt, title: c?.report?.title ?? "Report", reviewed: !!c?.review };
    }),
  });
}

export async function POST(req: NextRequest) {
  if (!FEATURES.dueDiligence) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const buyer = await getBuyerSession();
  if (!buyer) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { projectName?: string; location?: string; propertyType?: string; quotedPricePerSqft?: number; sizeSqft?: number; documentIds?: string[]; phone?: string };
  const location = (b.location ?? "").trim().slice(0, 120);
  const phone = (b.phone ?? "").replace(/[^\d+]/g, "").slice(0, 16);
  if (!location) return NextResponse.json({ error: "Enter the area (and city)." }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Enter a phone number so a reviewer can reach you." }, { status: 400 });

  const report = await buildDueDiligence({
    projectName: (b.projectName ?? "").trim().slice(0, 100) || null,
    location, propertyType: (b.propertyType ?? "apartment").toLowerCase().slice(0, 30),
    quotedPricePerSqft: Number(b.quotedPricePerSqft) > 0 ? Number(b.quotedPricePerSqft) : null,
    sizeSqft: Number(b.sizeSqft) > 0 ? Number(b.sizeSqft) : null,
    documentIds: Array.isArray(b.documentIds) ? b.documentIds.filter((x) => typeof x === "string").slice(0, 10) : [],
  }, buyer.id);

  const lead = await prisma.lead.create({
    data: {
      name: buyer.name, email: buyer.email, phone, source: SOURCE, message: `Due diligence: ${report.title}`,
      reportContext: { kind: "due_diligence", report, review: null } as never,
      ...leadAttribution(req.cookies.get(ATTRIBUTION_COOKIE)?.value),
    },
  });
  notifyNewLead({ id: lead.id, name: lead.name, source: SOURCE, phone }).catch(() => null);
  await sendLeadAlert(lead.id, "Due diligence report requested -- needs a reviewer.").catch(() => null);
  return NextResponse.json({ id: lead.id }, { status: 201 });
}
