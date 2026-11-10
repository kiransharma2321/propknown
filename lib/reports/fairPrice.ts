import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getMarketPrice, unitLabel } from "@/lib/engine";
import { sourceDomains } from "@/lib/engine/confidence";
import { toE164 } from "@/lib/phone";
import { notifyNewLead } from "@/lib/notifications";
import type { leadAttribution } from "@/lib/attribution";
import { SITE_URL } from "@/lib/site";
import { waLink, searchContextText } from "@/lib/whatsapp";
import { sendTracked, unsubscribeUrl, normaliseEmail, signValue } from "@/lib/emails/send";
import { fairPriceEmail } from "@/lib/emails/templates";
import { computeTrueCost, stateFromLocation, RATE_TABLE } from "@/lib/trueCost";
import { buildFairPricePdf, type FairPriceSnapshot } from "@/lib/reports/fairPricePdf";
import { siteLinkFor, sendLeadAlert, ReportLeadError } from "@/lib/leads/report";

// "Download Free Report" -> Fair-Price Report PDF. Numbers come only from the engine's cache
// (cacheOnly: never a fresh paid AI call), so the PDF matches what the visitor just saw.

export const FAIR_PRICE_SOURCE = "Fair-Price Report";
export const CONSENT_TEXT = "Email me this report. PropKnown may follow up by email or phone about it; I can unsubscribe any time.";

const TYPE_LABEL: Record<string, string> = {
  apartment: "apartment", villa: "villa", house: "independent house", plot: "plot", commercial: "commercial property", agriculture: "farm land",
};
const EXAMPLE_SQFT = 1200; // size used for the true-cost example (stated in the PDF)

export async function buildSnapshot(location: string, propertyType: string, name: string, unit?: string): Promise<FairPriceSnapshot | null> {
  const m = await getMarketPrice({ location, propertyType, unit, tool: "ai_intel", cacheOnly: true, skipLog: true });
  if (!m.available || !m.currentPricePerSqft) return null;
  const u = String(m.pricePerSqftUnit ?? "sqft");
  const urls = (Array.isArray(m.sourceUrls) ? m.sourceUrls : []) as string[];
  const sources = urls.map((url) => ({ url, host: sourceDomains([url])[0] })).filter((s) => s.host);
  const confidence = sources.length === 0
    ? { level: "Low", reason: "Sources unavailable for this result." }
    : (m.confidence ?? null);

  // True-cost example only for Indian states we have sourced rates for, and per-sq.ft prices.
  let trueCost: FairPriceSnapshot["trueCost"] = null;
  const state = m.currency === "INR" ? stateFromLocation(String(m.locationName ?? location)) : null;
  if (state && u === "sqft") {
    const basePrice = Math.round(m.currentPricePerSqft * EXAMPLE_SQFT);
    const t = computeTrueCost({ state, city: String(m.locationName ?? location), basePrice, gst: "under_construction" });
    trueCost = { state, areaSqft: EXAMPLE_SQFT, basePrice, lines: t.lines, total: t.total, ratesCheckedOn: RATE_TABLE[state].lastChecked };
  }

  return {
    name, locationName: String(m.locationName ?? location), propertyType, unitLabel: unitLabel(u), currency: String(m.currency ?? "INR"),
    price: m.currentPricePerSqft, rangeMin: (m.priceRangeMin as number) ?? null, rangeMax: (m.priceRangeMax as number) ?? null,
    confidence, guidance: m.guidanceValue ? {
      ratePerUnit: m.guidanceValue.ratePerUnit, sourceName: m.guidanceValue.sourceName,
      sourceUrl: m.guidanceValue.sourceUrl, effectiveDate: m.guidanceValue.effectiveDate,
    } : null,
    history: Array.isArray(m.priceHistory5yr) ? m.priceHistory5yr as FairPriceSnapshot["history"] : [],
    forecast: Array.isArray(m.priceForecast5yr) ? m.priceForecast5yr as FairPriceSnapshot["forecast"] : [],
    sources, fetchedAt: String(m.fetchedAt ?? new Date().toISOString()), trueCost,
    generatedAt: new Date().toISOString(), pageUrl: siteLinkFor(location),
  };
}

export function downloadUrl(leadId: string): string {
  return `${SITE_URL}/api/fair-price-report/${leadId}?t=${signValue(`fpr:${leadId}`)}`;
}

export interface FairPriceInput {
  name: string; phone: string; email: string; consent: boolean;
  location: string; propertyType?: string; unit?: string; ip?: string | null;
  attribution?: ReturnType<typeof leadAttribution>;
}

export async function createFairPriceReport(input: FairPriceInput) {
  const name = input.name?.trim().slice(0, 80);
  const email = input.email ? normaliseEmail(input.email) : "";
  const location = input.location?.trim().slice(0, 120);
  const phone = toE164(input.phone ?? "");
  const propertyType = input.propertyType && TYPE_LABEL[input.propertyType] ? input.propertyType : "apartment";
  if (!name) throw new ReportLeadError("Please enter your name.");
  if (!phone) throw new ReportLeadError("Please enter a valid phone number with country code.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new ReportLeadError("Please enter a valid email address.");
  if (!input.consent) throw new ReportLeadError("Please tick the box so we can email you the report.");
  if (!location) throw new ReportLeadError("Missing location.");

  const [recentToAddress, recentFromPhone] = await Promise.all([
    prisma.emailLog.count({ where: { to: email, kind: "report", createdAt: { gte: new Date(Date.now() - 86_400_000) } } }),
    prisma.lead.count({ where: { phone, createdAt: { gte: new Date(Date.now() - 600_000) } } }),
  ]);
  if (recentToAddress >= 3 || recentFromPhone >= 3) {
    throw new ReportLeadError("You've requested several reports already — please check your inbox, or WhatsApp us on 70130 16003.", 429);
  }

  const snapshot = await buildSnapshot(location, propertyType, name, input.unit);
  if (!snapshot) throw new ReportLeadError("We don't have enough data for this area yet to make a report — we never guess. Try a nearby area, or WhatsApp us on 70130 16003.", 422);

  const where = snapshot.locationName;
  const lead = await prisma.lead.create({
    data: {
      name, phone, email,
      source: `${FAIR_PRICE_SOURCE} — ${where}`.slice(0, 120),
      message: `Downloaded the Fair-Price Report for ${TYPE_LABEL[propertyType]} in ${where}.`,
      tags: ["fair_price_report"],
      reportContext: {
        tool: "fair_price_report", location, locationName: where, propertyType, unit: input.unit ?? null,
        pricePerUnit: snapshot.price, currencySymbol: snapshot.currency === "INR" ? "₹" : snapshot.currency,
        consent: { text: CONSENT_TEXT, at: new Date().toISOString() }, ip: input.ip ?? null,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
      } as Prisma.InputJsonValue,
      ...(input.attribution ?? {}),
    },
  });

  notifyNewLead({ id: lead.id, name, source: lead.source, phone }).catch(() => null);

  const pdf = Buffer.from(await buildFairPricePdf(snapshot));
  const ctx = { tool: "ai_intel", location: where, propertyType };
  const { subject, html } = fairPriceEmail({
    name, location: where, propertyLabel: TYPE_LABEL[propertyType], downloadUrl: downloadUrl(lead.id),
    link: siteLinkFor(location), whatsappLink: waLink(searchContextText(ctx)), unsubscribeUrl: unsubscribeUrl(email),
  });
  const sent = await sendTracked({
    to: email, subject, html, kind: "report", leadId: lead.id,
    attachments: [{ filename: `PropKnown-Fair-Price-Report-${where.split(",")[0].replace(/[^A-Za-z0-9]+/g, "-")}.pdf`, content: pdf }],
  });
  if (sent.ok) await prisma.lead.update({ where: { id: lead.id }, data: { sequenceStep: 1, sequenceStartedAt: new Date() } });
  await sendLeadAlert(lead.id, "Downloaded the Fair-Price Report.").catch(() => null);

  return { leadId: lead.id, emailed: sent.ok, downloadUrl: downloadUrl(lead.id), shareUrl: siteLinkFor(location), locationName: where };
}
