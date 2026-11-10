import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/clientIp";
import { leadAttribution, ATTRIBUTION_COOKIE } from "@/lib/attribution";
import { createReportLead, ReportLeadError, type ReportLeadInput } from "@/lib/leads/report";

export const maxDuration = 30;

// Public endpoint behind the "Email me the full report + 5-year forecast" form on Price Check,
// AI Intelligence, Fraud Check and the /prices pages.
export async function POST(req: NextRequest) {
  let body: Partial<ReportLeadInput>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  try {
    const r = await createReportLead({
      name: String(body.name ?? ""), phone: String(body.phone ?? ""), email: String(body.email ?? ""),
      tool: body.tool as ReportLeadInput["tool"], location: String(body.location ?? ""),
      propertyType: body.propertyType ? String(body.propertyType) : undefined,
      unit: body.unit ? String(body.unit) : undefined,
      askingPricePerUnit: Number(body.askingPricePerUnit) || undefined,
      reraNumber: body.reraNumber ? String(body.reraNumber) : undefined,
      riskLevel: body.riskLevel ? String(body.riskLevel) : undefined,
      projectName: body.projectName ? String(body.projectName).slice(0, 100) : undefined,
      ip: getClientIp(req),
      attribution: leadAttribution(req.cookies.get(ATTRIBUTION_COOKIE)?.value),
    });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof ReportLeadError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[report-lead] failed:", e);
    return NextResponse.json({ error: "Something went wrong — please try again, or WhatsApp us on 70130 16003." }, { status: 500 });
  }
}
