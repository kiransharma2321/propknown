import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { webSearch, type Hit } from "@/lib/search";
import { fetchPage } from "@/lib/search/fetcher";
import { aiJson } from "@/lib/ai/router";
import { getMarketPrice } from "@/lib/engine";
import { isPlausiblePrice } from "@/lib/engine/plausibility";
import { CHECKLIST_ITEMS } from "@/lib/listings/checklist";
import { sameProject } from "@/lib/listings/finder";
import {
  CATEGORIES, researchQueries, isResaleOrSellerPage, redactContacts, supportedBy, conflicts, missingFields,
  confidenceScore, describe, priceLabel, perUnitNumber, type Facts, type FactKey, type ResearchCategory,
} from "./rules";

// Auto Listing Researcher (flag NEXT_PUBLIC_FEATURE_LISTING_RESEARCHER). Finds projects on sale
// now from public pages: search (own layer) -> fetch (robots.txt respected) -> free AI extracts
// facts with the source they came from -> every fact re-checked against that source's text ->
// merged per project -> price check vs area, duplicate, conflict, confidence, missing fields ->
// draft in the Approval Queue + a "request photos" outreach task. No page text or photos are
// republished; individual resale sellers and contact details are never collected.

export interface Candidate {
  category: ResearchCategory; city: string; facts: Facts; currency: string;
  checks: { priceVsArea: "within" | "outside" | "no_data"; areaPrice?: number; areaUnit?: string; duplicateOf?: string | null; conflicts: string[]; missing: string[] };
  confidence: number; description: string; priceNote: string | null;
}

interface Extracted { projects?: Record<string, { value?: string | number | null; source?: number | null } | null>[] }

const FIELDS: FactKey[] = ["name", "builder", "builderLegalName", "location", "approvalType", "approvalNumber", "configurations", "sizes", "pricePerUnit", "totalPrice", "priceUnit", "areaBasis", "possession", "status", "builderWebsite"];
const MAX_PAGE_CHARS = 7_000;

function prompt(city: string, cat: ResearchCategory, sources: { i: number; url: string; text: string }[]): string {
  const label = CATEGORIES.find((c) => c.id === cat)!.label;
  return `You extract facts about NEW ${label.toUpperCase()}S currently on sale in or near ${city} from the numbered sources below.
Return ONLY JSON: {"projects":[{...}]} with up to 8 projects. For each project, each key is an object {"value": ..., "source": <number of the source that states it>} or null:
name, builder (brand name), builderLegalName (e.g. "X Infra Pvt Ltd", only if written), location (locality), approvalType (RERA / HMDA / DTCP / BDA / DLD ...),
approvalNumber (exact, only if written), configurations (e.g. "2 & 3 BHK", "150-300 sq yd plots"), sizes (as written), pricePerUnit (ONE number: the price per sq ft or per sq yd exactly as written; never compute it), totalPrice (a unit's total price or range as written, e.g. "85 L - 1.2 Cr"),
priceUnit ("sq ft" / "sq yd" / "acre"), areaBasis ("super built-up" / "built-up" / "carpet" / "plot area", only if written), possession (as written), status ("new launch" / "under construction" / "ready to move"), builderWebsite (official site URL if written).
Example of one project: {"name":{"value":"Green Meadows","source":2},"builder":{"value":"ABC Developers","source":2},"location":{"value":"Kollur","source":2},"approvalNumber":null,"pricePerUnit":{"value":"6,800","source":3},"priceUnit":{"value":"sq ft","source":3}, ...}
RULES: use ONLY what the sources state; null if not stated; never guess or use outside knowledge. Only developer projects / ventures being sold now. NEVER include individual resale or owner listings, rentals, or any person's name, phone or email. Copy values exactly; no descriptions.

${sources.map((s) => `[${s.i}] ${s.url}\n${s.text}`).join("\n\n")}`;
}

const CITY_ALIASES: Record<string, string> = { Hyderabad: "hyderabad|secunderabad|telangana|gachibowli|kokapet|shamshabad|medchal|kompally", Bengaluru: "bengaluru|bangalore", Mumbai: "mumbai|thane|navi mumbai", Pune: "pune|pimpri", Chennai: "chennai", Dubai: "dubai" };
const INDIA_PORTALS = ["magicbricks.com", "99acres.com", "housing.com", "squareyards.com", "proptiger.com", "makaan.com", "realtyhunting.com"];
const DUBAI_PORTALS = ["propertyfinder.ae", "bayut.com", "emaar.com", "damacproperties.com", "sobharealty.com"];
const cityRe = (city: string) => new RegExp(CITY_ALIASES[city] ?? city, "i");

// Keep the part of a page most likely to hold facts (price / approval / config mentions).
function focus(text: string): string {
  const t = redactContacts(text);
  if (t.length <= MAX_PAGE_CHARS) return t;
  const lines = t.split("\n");
  const keep = lines.filter((l) => /rera|hmda|dtcp|approv|bhk|sq\.?\s?(ft|yd)|per\s+sq|₹|rs\.?|aed|possession|launch|price|acre|villa|plot|developer|builder/i.test(l));
  return (keep.join("\n") || t).slice(0, MAX_PAGE_CHARS);
}

export async function gatherSources(city: string, cat: ResearchCategory, stats: Record<string, number>): Promise<{ i: number; url: string; text: string; capturedAt: string }[]> {
  const hits = new Map<string, Hit>();
  const [q1, q2] = researchQueries(city, cat);
  // One open query (builder sites, news) + one on the main new-project portals.
  const plan: [string, string[] | undefined][] = [[q1, undefined], [q2, city === "Dubai" ? DUBAI_PORTALS : INDIA_PORTALS]];
  for (const [q, domains] of plan) {
    stats.searches = (stats.searches ?? 0) + 1;
    for (const h of await webSearch(q, { maxResults: 8, domains })) {
      if (isResaleOrSellerPage(h.url)) { stats.resaleSkipped = (stats.resaleSkipped ?? 0) + 1; continue; }
      // Only pages about this city (search engines drift to other countries' "apartments").
      if (!cityRe(city).test(`${h.title} ${h.url} ${h.content}`)) { stats.offCity = (stats.offCity ?? 0) + 1; continue; }
      if (!hits.has(h.url)) hits.set(h.url, h);
    }
  }
  const out: { i: number; url: string; text: string; capturedAt: string }[] = [];
  for (const h of Array.from(hits.values()).slice(0, 10)) {
    let text = h.content ?? "", capturedAt = new Date().toISOString();
    try {
      const page = await fetchPage(h.url, { timeoutMs: 10_000 });
      text = page.text; capturedAt = page.fetchedAt; stats.pagesFetched = (stats.pagesFetched ?? 0) + 1;
    } catch (e) {
      // robots.txt disallowed or unreachable: only the search snippet is used.
      if (e instanceof Error && /robots/.test(e.message)) stats.robotsBlocked = (stats.robotsBlocked ?? 0) + 1;
    }
    if (text.trim().length > 80) out.push({ i: out.length + 1, url: h.url, text: focus(text), capturedAt });
  }
  return out;
}

// Extract -> verify each fact against the source it cites -> merge per project.
export async function extractCandidates(city: string, cat: ResearchCategory, sources: { i: number; url: string; text: string; capturedAt: string }[], stats: Record<string, number>) {
  if (!sources.length) return [] as { facts: Facts }[];
  const { value, provider } = await aiJson<Extracted>(prompt(city, cat, sources), { timeoutMs: 45_000, maxTokens: 4096 });
  stats[`ai_${provider}`] = (stats[`ai_${provider}`] ?? 0) + 1;
  stats.aiProjects = (stats.aiProjects ?? 0) + (value.projects?.length ?? 0);
  const merged: { facts: Facts }[] = [];
  for (const p of value.projects ?? []) {
    const facts: Facts = {};
    // Models sometimes answer "name": "X" (+ a project-level "source") instead of {value, source}.
    const projectSource = (p as Record<string, unknown> | null)?.source;
    for (const k of FIELDS) {
      const rawF = p?.[k] as unknown;
      const f = rawF != null && typeof rawF !== "object" ? { value: rawF as string | number, source: Number(projectSource) } : (rawF as { value?: string | number | null; source?: number | null } | null);
      if (!f || f.value == null || f.value === "") continue;
      const src = sources.find((s) => s.i === Number(f.source));
      const v = String(f.value).trim().slice(0, 200);
      // Re-check: the cited source must contain the value (units/labels are taken as given).
      const check = ["priceUnit", "areaBasis", "status", "approvalType"].includes(k) ? !!src : !!src && supportedBy(f.value, src.text);
      if (!check) { stats.unsupportedDropped = (stats.unsupportedDropped ?? 0) + 1; continue; }
      if (k === "builderWebsite" && !/^https?:\/\/|^www\./i.test(v)) continue;
      // A "per unit" figure that is really a total / range is filed as the total price.
      const key: FactKey = k === "pricePerUnit" && perUnitNumber(v) === null ? "totalPrice" : k;
      if (facts[key]) continue;
      facts[key] = [{ value: v, sourceUrl: src!.url, capturedAt: src!.capturedAt }];
    }
    if (!facts.name) { stats.noVerifiedName = (stats.noVerifiedName ?? 0) + 1; continue; }
    if (!facts.location) { stats.noVerifiedLocation = (stats.noVerifiedLocation ?? 0) + 1; continue; }
    const same = merged.find((m) => sameProject({ projectName: m.facts.name![0].value, builder: m.facts.builder?.[0]?.value }, { projectName: facts.name![0].value, builder: facts.builder?.[0]?.value }));
    if (same) {
      for (const k of FIELDS) for (const f of facts[k] ?? []) if (!(same.facts[k] ?? []).some((x) => x.sourceUrl === f.sourceUrl)) (same.facts[k] ??= []).push(f);
    } else merged.push({ facts });
  }
  return merged;
}

const toPerSqft = (price: number, unit?: string) => (/yd|yard|gaj/i.test(unit ?? "") ? price / 9 : /acre/i.test(unit ?? "") ? price / 43_560 : price);

export async function preQueueChecks(facts: Facts, cat: ResearchCategory, city: string): Promise<Candidate> {
  const currency = city === "Dubai" ? "AED" : "INR";
  const catInfo = CATEGORIES.find((c) => c.id === cat)!;
  const loc = `${facts.location![0].value}, ${city}`;
  let priceVsArea: Candidate["checks"]["priceVsArea"] = "no_data", areaPrice: number | undefined, areaUnit: string | undefined;
  const p = perUnitNumber(facts.pricePerUnit?.[0]?.value ?? "") ?? 0;
  const unit = facts.priceUnit?.[0]?.value;
  if (p > 0 && !isPlausiblePrice(toPerSqft(p, unit), currency, "sqft") && !/acre/i.test(unit ?? "")) delete facts.pricePerUnit;
  if (facts.pricePerUnit) {
    // Cached area data only: the check never spends paid calls.
    const m = await getMarketPrice({ location: loc, propertyType: catInfo.propertyType, unit: "sqft", tool: "listing_check", cacheOnly: true, skipLog: true }).catch(() => null);
    if (m?.available && Number(m.currentPricePerSqft) > 0) {
      areaPrice = Number(m.currentPricePerSqft); areaUnit = "sqft";
      const ratio = toPerSqft(p, unit) / areaPrice;
      priceVsArea = ratio >= 0.6 && ratio <= 1.7 ? "within" : "outside";
    }
  }
  const dup = await findDuplicate(facts);
  const conf = conflicts(facts), missing = missingFields(facts);
  return {
    category: cat, city, facts, currency,
    checks: { priceVsArea, areaPrice, areaUnit, duplicateOf: dup, conflicts: conf, missing },
    confidence: confidenceScore(facts, { priceVsArea, conflictCount: conf.length }),
    description: describe(facts, cat, city), priceNote: priceLabel(facts, currency),
  };
}

// Duplicate: same project name + builder as an existing (non-rejected) draft or live listing.
async function findDuplicate(facts: Facts): Promise<string | null> {
  const name = facts.name![0].value, builder = facts.builder?.[0]?.value ?? null;
  const first = name.split(/\s+/)[0];
  const drafts = await prisma.listingDraft.findMany({ where: { reviewStatus: { not: "rejected" }, projectName: { contains: first, mode: "insensitive" } }, select: { id: true, projectName: true, builder: true } }).catch(() => []);
  const d = drafts.find((x) => sameProject(x, { projectName: name, builder }));
  if (d) return `draft ${d.id}`;
  const props = await prisma.property.findMany({ where: { title: { contains: first, mode: "insensitive" } }, select: { id: true, title: true } }).catch(() => []);
  const p = props.find((x) => sameProject({ projectName: x.title.split(/\s+[—-]\s+|\s+\d\s*BHK/i)[0] }, { projectName: name, builder }));
  return p ? `listing ${p.id}` : null;
}

export async function researchCategory(city: string, cat: ResearchCategory, stats: Record<string, number>, limit = 8): Promise<Candidate[]> {
  const sources = await gatherSources(city, cat, stats);
  const found = await extractCandidates(city, cat, sources, stats);
  const out: Candidate[] = [];
  for (const c of found.slice(0, limit)) out.push(await preQueueChecks(c.facts, cat, city));
  return out;
}

export function draftData(c: Candidate, runId: string | null): Prisma.ListingDraftCreateInput {
  const v = (k: FactKey) => c.facts[k]?.[0]?.value ?? null;
  const approvalType = (v("approvalType") ?? "").toUpperCase();
  const reraNumber = v("approvalNumber") && /RERA/.test(approvalType) ? v("approvalNumber")!.toUpperCase() : null;
  return {
    origin: "research", category: c.category, sourceName: "Auto Listing Researcher", sourceUrl: c.facts.name![0].sourceUrl,
    projectName: v("name")!, builder: v("builderLegalName") ?? v("builder"), location: v("location"), city: c.city,
    propertyType: CATEGORIES.find((x) => x.id === c.category)!.propertyType, configuration: v("configurations"), sizeText: v("sizes"),
    projectStatus: v("status"), possessionDate: v("possession"), reraNumber,
    approvalAuthority: v("approvalNumber") && !reraNumber ? approvalType || "Other" : null, approvalNumber: v("approvalNumber") && !reraNumber ? v("approvalNumber") : null,
    currency: c.currency, price: null, priceNote: c.priceNote, description: c.description, builderWebsite: v("builderWebsite"),
    facts: c.facts as Prisma.InputJsonValue, checks: c.checks as Prisma.InputJsonValue, confidence: c.confidence,
    researchRunId: runId, lastCheckedAt: new Date(), checklist: CHECKLIST_ITEMS.map(() => false),
  };
}

// Full run for one city: every category -> drafts (skipping duplicates and RERA clashes) +
// a "request photos" outreach task per new draft. dryRun returns the candidates without writing.
export async function runResearch(city: string, categories: ResearchCategory[], o: { trigger: string; by?: string; dryRun?: boolean; perCategory?: Partial<Record<ResearchCategory, number>> }) {
  const stats: Record<string, number> = {};
  const run = o.dryRun ? null : await prisma.researchRun.create({ data: { city, categories, trigger: o.trigger, startedBy: o.by ?? null } });
  const all: Candidate[] = [];
  for (const cat of categories) {
    try { all.push(...await researchCategory(city, cat, stats, o.perCategory?.[cat] ?? 8)); }
    catch (e) { stats.errors = (stats.errors ?? 0) + 1; console.error(`[research] ${city} ${cat}:`, e instanceof Error ? e.message : e); }
  }
  let drafted = 0;
  if (!o.dryRun) {
    for (const c of all) {
      if (c.checks.duplicateOf) { stats.duplicates = (stats.duplicates ?? 0) + 1; continue; }
      try {
        const d = await prisma.listingDraft.create({ data: draftData(c, run!.id) });
        await prisma.outreachTask.create({ data: { draftId: d.id, kind: "request_photos", builder: d.builder, website: d.builderWebsite, projectName: d.projectName,
          notes: "Ask the builder for photos we may use, with written permission. Until then the listing has no project photos (or a licensed area image labelled 'Representative image of the area')." } });
        drafted++;
      } catch (e) {
        if ((e as { code?: string }).code === "P2002") stats.duplicates = (stats.duplicates ?? 0) + 1; else throw e;
      }
    }
    await prisma.researchRun.update({ where: { id: run!.id }, data: { finishedAt: new Date(), stats: { ...stats, candidates: all.length, drafted } } });
  }
  return { runId: run?.id ?? null, candidates: all, stats: { ...stats, candidates: all.length, drafted } };
}
