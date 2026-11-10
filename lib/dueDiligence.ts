import { prisma } from "@/lib/db";
import { getMarketPrice, unitLabel } from "@/lib/engine";
import { sourceHosts } from "@/lib/engine/sources";
import { reraGuidance } from "@/lib/engine/rera";
import { findCachedProject } from "@/lib/projects";
import { sourceSiteCount } from "@/lib/projects/sites";
import { scoreFor } from "@/lib/investmentScoreData";
import { computeTrueCost, stateFromLocation, type GstKey } from "@/lib/trueCost";
import { LEGAL_CHECKLIST_ITEMS } from "@/lib/legalShield";
import type { DocResult } from "@/lib/documentChecker";

// M6: Due Diligence Report. An "agent" that runs our existing checks in sequence -- area price,
// project facts, RERA format/portal, the customer's own document checks, true cost, Investment
// Score -- and assembles one PRELIMINARY report. Cache only (no paid calls); every step records
// what it checked and where the data came from. A PropKnown reviewer signs it off before it
// should be relied on. Never legal advice.

export const DD_DISCLAIMER = "Preliminary due-diligence report, not legal advice. It combines public listing data, AI readings and standard checks. A PropKnown reviewer will check it, and a property lawyer must verify the original documents before you pay a token.";

export interface DDInput { projectName?: string | null; location: string; propertyType: string; quotedPricePerSqft?: number | null; sizeSqft?: number | null; documentIds?: string[] }

export interface DDStep { step: string; status: "done" | "no_data" | "skipped"; detail: string; source: string }

export interface DDReport {
  kind: "due_diligence";
  version: 1;
  generatedAt: string;
  input: DDInput;
  title: string;
  steps: DDStep[];
  price: { area: { value: number; symbol: string; unit: string; range: [number | null, number | null]; confidence: string | null; sources: number; capturedAt: string | null } | null;
           project: { median: number; min: number; max: number; sources: number; confidence: string | null; capturedAt: string } | null;
           quote: { value: number; vsArea: number | null; vsProject: number | null } | null };
  project: { name: string; facts: { label: string; value: string; sourceUrl: string }[] } | null;
  rera: { jurisdiction: string; authority: string; portalUrl: string | null; stated: string | null; formatNote: string; steps: string[] };
  documents: { id: string; fileName: string; docType: string; risk: string | null; flags: { issue: string; severity: string }[]; reviewed: boolean }[];
  trueCost: { sqft: number; total: number; lines: { label: string; amount: number }[]; gstNote: string } | null;
  score: { score: number | null; band: string | null; basedOn: string } | null;
  checklist: { key: string; label: string; why: string; status: "pending" }[];
  redFlags: string[];
  disclaimer: string;
}

const pct = (a: number, b: number) => Math.round(((a - b) / b) * 1000) / 10;

export async function buildDueDiligence(input: DDInput, buyerId: string): Promise<DDReport> {
  const steps: DDStep[] = [];
  const redFlags: string[] = [];
  const loc = input.location.trim();

  // 1. Area price (cache)
  const m = await getMarketPrice({ location: loc, propertyType: input.propertyType, tool: "seo_page", cacheOnly: true, skipLog: true }).catch(() => null);
  const areaHosts = m?.available ? sourceHosts(m.sourceUrls) : [];
  const area = m?.available && Number(m.currentPricePerSqft) > 0 && areaHosts.length ? {
    value: Number(m.currentPricePerSqft), symbol: String(m.currencySymbol ?? "₹"), unit: unitLabel(String(m.pricePerSqftUnit ?? "sqft")),
    range: [Number(m.priceRangeMin) || null, Number(m.priceRangeMax) || null] as [number | null, number | null],
    confidence: (m.confidence as { level?: string } | undefined)?.level ?? null, sources: areaHosts.length, capturedAt: m.fetchedAt ? String(m.fetchedAt) : null,
  } : null;
  steps.push(area
    ? { step: "Area asking price", status: "done", detail: `${area.symbol}${area.value.toLocaleString("en-IN")}/${area.unit}, ${area.confidence} confidence`, source: `${area.sources} websites, captured ${area.capturedAt?.slice(0, 10)}` }
    : { step: "Area asking price", status: "no_data", detail: "No sourced price on record for this area yet", source: "PropKnown price cache" });

  // 2. Project (cache)
  let project: DDReport["project"] = null;
  let projPrice: DDReport["price"]["project"] = null;
  let status: string | null = null;
  let stated: string | null = null;
  if (input.projectName) {
    const p = await findCachedProject(input.projectName, loc, input.propertyType);
    if (p) {
      project = { name: p.name, facts: Object.entries(p.facts).filter(([, f]) => f).map(([k, f]) => ({ label: k, value: f!.value, sourceUrl: f!.sourceUrl })) };
      status = p.facts.status?.value ?? null;
      stated = p.facts.reraNumber?.value ?? null;
      if (p.price && p.price.sources.length) projPrice = { median: p.price.median, min: p.price.min, max: p.price.max, sources: sourceSiteCount(p.price), confidence: p.confidence?.level ?? null, capturedAt: p.price.capturedAt };
      steps.push({ step: "Project facts and asking price", status: "done", detail: `${project.facts.length} facts${projPrice ? `, asking ₹${projPrice.min.toLocaleString("en-IN")}–${projPrice.max.toLocaleString("en-IN")}/sq.ft` : ", no dated asking price"}`, source: "Listing portals and the builder's pages (each fact linked)" });
    } else {
      steps.push({ step: "Project facts and asking price", status: "no_data", detail: "This project hasn't been checked yet. Run a Project Check first for project facts.", source: "PropKnown project cache" });
    }
  } else steps.push({ step: "Project facts and asking price", status: "skipped", detail: "No project name given", source: "" });

  // 3. Quote vs market
  let quote: DDReport["price"]["quote"] = null;
  if (input.quotedPricePerSqft && input.quotedPricePerSqft > 0) {
    quote = { value: input.quotedPricePerSqft, vsArea: area ? pct(input.quotedPricePerSqft, area.value) : null, vsProject: projPrice ? pct(input.quotedPricePerSqft, projPrice.median) : null };
    if ((quote.vsProject ?? quote.vsArea ?? 0) > 15) redFlags.push(`The quoted price is ${quote.vsProject ?? quote.vsArea}% above the ${quote.vsProject != null ? "project's" : "area's"} typical asking price.`);
    if (area?.range[0] && input.quotedPricePerSqft < area.range[0] * 0.6) redFlags.push("The quoted price is far below the area's typical range: a classic bait sign, or a sign of title/legal problems.");
    steps.push({ step: "Your quoted price vs the market", status: "done", detail: `${quote.vsProject != null ? `${quote.vsProject}% vs project` : ""}${quote.vsProject != null && quote.vsArea != null ? ", " : ""}${quote.vsArea != null ? `${quote.vsArea}% vs area` : ""}` || "No market figure to compare", source: "Calculated from the figures above" });
  }

  // 4. RERA
  const g = reraGuidance({ location: loc, reraNumber: stated ?? undefined });
  // Only after the project was actually checked: an unchecked project hasn't been searched for a number.
  if (input.projectName && project && !stated) redFlags.push("No RERA number found in any source for this project. Ask the builder for it and check it on the RERA portal.");
  steps.push({ step: "RERA", status: stated ? "done" : "no_data", detail: input.projectName && !project ? "Not searched yet: run a Project Check first" : stated ? `${stated} (stated by a source; format ${g.format === "matches_known_format" ? "matches" : "does not match"} the official pattern). Not verified by PropKnown.` : "No RERA number found in sources", source: g.authority });

  // 5. Customer's own document checks (owner only)
  const docs = input.documentIds?.length ? await prisma.documentCheck.findMany({ where: { id: { in: input.documentIds.slice(0, 10) }, buyerId }, select: { id: true, fileName: true, docType: true, result: true, reviewStatus: true } }).catch(() => []) : [];
  const documents = docs.map((d) => {
    const r = d.result as DocResult | null;
    for (const f of r?.redFlags ?? []) if (f.severity === "high") redFlags.push(`${d.fileName}: ${f.issue}`);
    return { id: d.id, fileName: d.fileName, docType: d.docType, risk: r?.risk ?? null, flags: (r?.redFlags ?? []).map((f) => ({ issue: f.issue, severity: f.severity })), reviewed: d.reviewStatus === "reviewed" };
  });
  steps.push(documents.length
    ? { step: "Your documents", status: "done", detail: `${documents.length} document reading(s) included`, source: "AI Document Checker (preliminary) + PropKnown review status" }
    : { step: "Your documents", status: "skipped", detail: "No documents attached. Upload them in the Document Checker for a fuller report.", source: "" });

  // 6. True cost
  let trueCost: DDReport["trueCost"] = null;
  const perSqft = input.quotedPricePerSqft || projPrice?.median || (area?.symbol.trim() === "₹" ? area.value : null);
  const state = stateFromLocation(`${loc} ${project?.facts.find((f) => f.label === "location")?.value ?? ""}`);
  if (perSqft && state) {
    const sqft = input.sizeSqft && input.sizeSqft > 0 ? input.sizeSqft : 1200;
    const gst: GstKey = /under\s*construction|ongoing/i.test(status ?? "") ? "under_construction" : "ready";
    const tc = computeTrueCost({ state, city: loc, basePrice: perSqft * sqft, gst });
    trueCost = { sqft, total: tc.total, lines: tc.lines.filter((l) => l.amount > 0), gstNote: status ? `GST per the project status "${status}" (from a source)` : "GST not included: construction status unknown" };
    steps.push({ step: "True cost", status: "done", detail: `${sqft} sq.ft at ₹${Math.round(perSqft).toLocaleString("en-IN")}/sq.ft`, source: `${state} government rates (see True Cost page for sources and dates)` });
  } else steps.push({ step: "True cost", status: "no_data", detail: perSqft ? "State not recognised from the location" : "No price to calculate from", source: "" });

  // 7. Investment Score
  const s = await scoreFor(loc, input.propertyType, input.projectName ?? null).catch(() => null);
  steps.push({ step: "Investment Score", status: s?.score != null ? "done" : "no_data", detail: s?.score != null ? `${s.score}/100 (${s.band}), ${s.basedOn}` : s?.basedOn ?? "Not available", source: "Published method: /investment-score#method" });

  return {
    kind: "due_diligence", version: 1, generatedAt: new Date().toISOString(), input,
    title: input.projectName ? `${input.projectName}, ${loc}` : loc,
    steps, price: { area, project: projPrice, quote }, project,
    rera: { jurisdiction: g.jurisdiction, authority: g.authority, portalUrl: g.portalUrl, stated, formatNote: g.formatNote, steps: g.steps },
    documents, trueCost, score: s ? { score: s.score, band: s.band, basedOn: s.basedOn } : null,
    checklist: LEGAL_CHECKLIST_ITEMS.map((i) => ({ key: i.key, label: i.label, why: i.why, status: "pending" as const })),
    redFlags, disclaimer: DD_DISCLAIMER,
  };
}
