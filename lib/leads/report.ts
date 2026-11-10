import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getMarketPrice, type EngineResult } from "@/lib/engine";
import { priceVerdict } from "@/lib/engine/verdict";
import { reraGuidance } from "@/lib/engine/rera";
import { matchLocality, localityPath } from "@/lib/localities";
import { toE164 } from "@/lib/phone";
import type { leadAttribution } from "@/lib/attribution";
import { SITE_URL } from "@/lib/site";
import { waLink, searchContextText } from "@/lib/whatsapp";
import { notifyNewLead } from "@/lib/notifications";
import { scoreLead, HOT_LEAD_SCORE } from "@/lib/leadScore";
import { sendTracked, unsubscribeUrl, normaliseEmail, ADMIN_ALERT_EMAIL } from "@/lib/emails/send";
import { reportEmail, leadAlertEmail, type MarketSnapshot } from "@/lib/emails/templates";

// "Email me the full report + 5-year forecast" (Task 2). The report is rebuilt server-side
// from the shared engine's cached data -- nothing the browser sends is echoed into the email
// except the visitor's own name and the location they typed (both escaped), so this endpoint
// can't be used to send arbitrary content from PropKnown's domain.

export type ReportTool = "price_check" | "ai_intel" | "legal_shield" | "seo_page";

export const TOOL_LABEL: Record<ReportTool, string> = {
  price_check: "Price Check",
  ai_intel: "AI Intelligence",
  legal_shield: "Fraud Check",
  seo_page: "Price Page",
};

const TYPE_LABEL: Record<string, string> = {
  apartment: "apartment", villa: "villa", house: "independent house", plot: "plot",
  commercial: "commercial property", agriculture: "farm land",
};

export interface ReportLeadInput {
  name: string;
  phone: string;
  email: string;
  tool: ReportTool;
  location: string;
  propertyType?: string;
  unit?: string;
  askingPricePerUnit?: number;   // price_check
  reraNumber?: string;           // legal_shield
  riskLevel?: string;            // legal_shield: Low | Medium | High
  ip?: string | null;
  attribution?: ReturnType<typeof leadAttribution>;
}

export class ReportLeadError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function snapshotOf(m: EngineResult): MarketSnapshot | null {
  if (!m.available) return null;
  return {
    locationName: String(m.locationName ?? ""),
    currencySymbol: String(m.currencySymbol ?? ""),
    currentPricePerSqft: Number(m.currentPricePerSqft),
    priceRangeMin: m.priceRangeMin as number | undefined,
    priceRangeMax: m.priceRangeMax as number | undefined,
    pricePerSqftUnit: m.pricePerSqftUnit as string | undefined,
    growthRate: (m.growthRate as number | null) ?? null,
    rentalYield: (m.rentalYield as number | null) ?? null,
    trend: m.trend as string | undefined,
    priceForecast5yr: Array.isArray(m.priceForecast5yr) ? m.priceForecast5yr as { year: number; value: number }[] : [],
    fetchedAt: m.fetchedAt as string | undefined,
    dataSourceLabel: m.dataSourceLabel as string | undefined,
  };
}

export function siteLinkFor(location: string): string {
  const loc = matchLocality(location);
  if (loc) return `${SITE_URL}${localityPath(loc)}`;
  return `${SITE_URL}/ai-intelligence?area=${encodeURIComponent(location)}`;
}

export async function createReportLead(input: ReportLeadInput) {
  const name = input.name?.trim().slice(0, 80);
  const email = input.email ? normaliseEmail(input.email) : "";
  const location = input.location?.trim().slice(0, 120);
  const phone = toE164(input.phone ?? "");
  const propertyType = input.propertyType && TYPE_LABEL[input.propertyType] ? input.propertyType : "apartment";
  if (!name) throw new ReportLeadError("Please enter your name.");
  if (!phone) throw new ReportLeadError("Please enter a valid phone number with country code.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new ReportLeadError("Please enter a valid email address.");
  if (!location) throw new ReportLeadError("Missing location.");
  if (!TOOL_LABEL[input.tool]) throw new ReportLeadError("Unknown tool.");

  // Abuse limits: 3 reports per address per day, 3 leads per phone per 10 minutes.
  const [recentToAddress, recentFromPhone] = await Promise.all([
    prisma.emailLog.count({ where: { to: email, kind: "report", createdAt: { gte: new Date(Date.now() - 86_400_000) } } }),
    prisma.lead.count({ where: { phone, createdAt: { gte: new Date(Date.now() - 600_000) } } }),
  ]);
  if (recentToAddress >= 3 || recentFromPhone >= 3) {
    throw new ReportLeadError("You've requested several reports already — please check your inbox, or WhatsApp us on 70130 16003.", 429);
  }

  // Market data: the visitor just ran this search, so it's normally a cache hit. cacheOnly
  // means a report request never triggers a fresh paid API call.
  const market = await getMarketPrice({ location, propertyType, unit: input.unit, tool: "price_check", cacheOnly: true, skipLog: true });
  const snapshot = snapshotOf(market);
  const typeLabel = TYPE_LABEL[propertyType];
  const where = snapshot?.locationName || location;

  let verdictLine: string | undefined;
  if (input.tool === "price_check" && snapshot && input.askingPricePerUnit && input.askingPricePerUnit > 0) {
    verdictLine = `Your price check: ${priceVerdict(input.askingPricePerUnit, market).message}`;
  }
  let reraLine: string | undefined;
  let riskLine: string | undefined;
  if (input.tool === "legal_shield") {
    const rera = reraGuidance({ location, reraNumber: input.reraNumber?.slice(0, 60) });
    reraLine = `${rera.formatNote} Verify at ${rera.portalUrl ?? "your state's RERA portal"}.`;
    if (["Low", "Medium", "High"].includes(input.riskLevel ?? "")) {
      riskLine = `Your fraud check came back as ${input.riskLevel} concern. Run it again any time on propknown.com/legal-shield.`;
    }
  }

  const ctx = { tool: input.tool, location: where, propertyType };
  const reportContext = {
    tool: input.tool, location, locationName: where, propertyType, unit: input.unit ?? null,
    pricePerUnit: snapshot?.currentPricePerSqft ?? null, currencySymbol: snapshot?.currencySymbol ?? null,
    askingPricePerUnit: input.askingPricePerUnit ?? null, riskLevel: input.riskLevel ?? null,
    ip: input.ip ?? null,
  };

  const lead = await prisma.lead.create({
    data: {
      name, phone, email,
      source: `${TOOL_LABEL[input.tool]} — ${where}`.slice(0, 120),
      message: `Requested the full ${TOOL_LABEL[input.tool]} report + 5-year forecast for ${typeLabel} in ${where}.`,
      tags: [input.tool, matchLocality(location) ? `${matchLocality(location)!.citySlug}/${matchLocality(location)!.slug}` : "other-location"],
      reportContext: reportContext as Prisma.InputJsonValue,
      ...(input.attribution ?? {}),
    },
  });
  notifyNewLead({ id: lead.id, name, source: lead.source, phone }).catch(() => null);

  const link = siteLinkFor(location);
  const { subject, html } = reportEmail({
    name, toolLabel: TOOL_LABEL[input.tool], location: where, propertyLabel: typeLabel,
    market: snapshot, verdictLine, reraLine, riskLine, link,
    whatsappLink: waLink(searchContextText(ctx)), unsubscribeUrl: unsubscribeUrl(email),
  });
  const sent = await sendTracked({ to: email, subject, html, kind: "report", leadId: lead.id });
  if (sent.ok) {
    await prisma.lead.update({ where: { id: lead.id }, data: { sequenceStep: 1, sequenceStartedAt: new Date() } });
  }

  // Score with the existing AI lead scorer, then alert the owner once (flagged HOT if it is).
  const scored = await scoreLead(lead.id, 8000);
  const hot = scored.ok && scored.result.leadScore >= HOT_LEAD_SCORE;
  await sendLeadAlert(lead.id, scored.ok
    ? `AI lead score ${scored.result.leadScore}/100 after requesting a report.`
    : "Requested a report (AI lead score unavailable).");

  return { leadId: lead.id, emailed: sent.ok, hot, hasData: Boolean(snapshot) };
}

export function describeSearch(ctx: unknown): string {
  const c = (ctx ?? {}) as { tool?: string; locationName?: string; location?: string; propertyType?: string };
  const tool = c.tool && c.tool in TOOL_LABEL ? TOOL_LABEL[c.tool as ReportTool] : c.tool ?? "Website";
  const type = c.propertyType ? TYPE_LABEL[c.propertyType] ?? c.propertyType : "";
  const loc = c.locationName || c.location;
  return loc ? `${tool}: ${type ? `${type} in ` : ""}${loc}` : tool;
}

// Owner alert for every new lead: one email per lead, sent from wherever the lead is created.
// Hot leads (AI score >= HOT_LEAD_SCORE) go through sendHotLeadAlert so the subject says 🔥 HOT.
export async function sendLeadAlert(leadId: string, reason = "New enquiry."): Promise<boolean> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { leadScore: true } });
  if (!lead) return false;
  if (lead.leadScore != null && lead.leadScore >= HOT_LEAD_SCORE) return sendHotLeadAlert(leadId, reason);
  const already = await prisma.emailLog.count({ where: { leadId, kind: { in: ["lead_alert", "hot_alert"] }, status: "sent" } });
  if (already > 0) return false;
  return sendAlert(leadId, false, reason);
}

// Instant 🔥 HOT owner alert with a one-click WhatsApp link to the lead. At most once per lead
// (also used when a lead is re-scored as hot in the CRM after its first alert).
export async function sendHotLeadAlert(leadId: string, reason: string): Promise<boolean> {
  const claimed = await prisma.lead.updateMany({ where: { id: leadId, hotAlertAt: null }, data: { hotAlertAt: new Date() } });
  if (claimed.count === 0) return false;
  return sendAlert(leadId, true, reason);
}

async function sendAlert(leadId: string, hot: boolean, reason: string): Promise<boolean> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return false;
  const c = (lead.reportContext ?? {}) as { tool?: string; locationName?: string; location?: string; propertyType?: string };
  const search = lead.reportContext ? describeSearch(lead.reportContext) : lead.source;
  const ctxText = c.location || c.locationName
    ? `Hi ${lead.name}, this is Raghu from PropKnown. I saw you checked ${c.locationName || c.location} ${c.propertyType ? `${TYPE_LABEL[c.propertyType] ?? c.propertyType} ` : ""}prices on our site — happy to help with any questions.`
    : `Hi ${lead.name}, this is Raghu from PropKnown. Thanks for your enquiry — how can I help?`;
  const { subject, html } = leadAlertEmail({
    hot, name: lead.name, phone: lead.phone, email: lead.email, search, score: lead.leadScore, summary: lead.aiSummary,
    message: lead.reportContext ? null : lead.message,
    reason, waToLead: waLink(ctxText, (toE164(lead.phone) ?? lead.phone).replace(/\D/g, "")),
    crmLink: `${SITE_URL}/crm/leads/${lead.id}`,
  });
  const r = await sendTracked({ to: ADMIN_ALERT_EMAIL, subject, html, kind: hot ? "hot_alert" : "lead_alert", leadId });
  return r.ok;
}
