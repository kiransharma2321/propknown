import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/clientIp";
import { ReportLeadError } from "@/lib/leads/report";
import { createFairPriceReport } from "@/lib/reports/fairPrice";

export const maxDuration = 30;

// "Download Free Report" on AI Intel results and area price pages.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  try {
    const r = await createFairPriceReport({
      name: String(body.name ?? ""), phone: String(body.phone ?? ""), email: String(body.email ?? ""),
      consent: body.consent === true, location: String(body.location ?? ""),
      propertyType: body.propertyType ? String(body.propertyType) : undefined,
      unit: body.unit ? String(body.unit) : undefined, ip: getClientIp(req),
    });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof ReportLeadError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[fair-price-report] failed:", e);
    return NextResponse.json({ error: "Something went wrong — please try again, or WhatsApp us on 70130 16003." }, { status: 500 });
  }
}
