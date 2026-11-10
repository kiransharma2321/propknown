import { prisma } from "@/lib/db";
import { getMarketPrice, unitLabel } from "@/lib/engine";
import { sourceHosts } from "@/lib/engine/sources";
import { findCachedProject } from "@/lib/projects";
import { sourceSiteCount } from "@/lib/projects/sites";
import { reraBadge } from "@/lib/listings/rera";
import { computeTrueCost, stateFromLocation, type GstKey } from "@/lib/trueCost";
import { FEATURES } from "@/lib/features";
import { scoreFor } from "@/lib/investmentScoreData";

// M3: compare 2-4 areas, projects or owner listings side by side. Every figure comes from the
// cache (the same sourced, dated numbers the site already shows) -- comparing never triggers a
// paid search/AI call. An item without data says so and links to the live check.

export const MAX_COMPARE = 4;
export const REFERENCE_SQFT = 1200;

export type CompareItem =
  | { kind: "area"; location: string; propertyType: string }
  | { kind: "project"; name: string; location: string; propertyType: string }
  | { kind: "listing"; id: string };

export interface CompareResult {
  key: string;
  kind: CompareItem["kind"];
  title: string;
  subtitle: string;
  link: string;
  price: { value: number; min: number | null; max: number | null; symbol: string; unit: string; label: string } | null;
  priceText: string | null;           // owner listings: the owner's asking price, as written
  confidence: string | null;
  sources: number;
  capturedAt: string | null;
  rera: { number: string; note: string; sourceUrl: string | null } | null;
  reraNote: string;
  possession: string | null;
  status: string | null;
  trueCost: { sqft: number; total: number; stampAndRegistration: number; gst: number; gstNote: string } | null;
  trueCostNote: string;
  missing: string | null;             // why there's no data, if any
  score: { score: number | null; band: string | null; basedOn: string } | null; // M4 (flag)
}

const clean = (s: string, n = 120) => s.replace(/[|\s]+/g, " ").trim().slice(0, n);

// URL form: area|Kokapet, Hyderabad|apartment   project|Name|Area|type   listing|id
export function parseItem(raw: string): CompareItem | null {
  const p = raw.split("|").map((x) => x.trim());
  if (p[0] === "area" && p[1]) return { kind: "area", location: clean(p[1]), propertyType: clean(p[2] || "apartment", 30).toLowerCase() };
  if (p[0] === "project" && p[1] && p[2]) return { kind: "project", name: clean(p[1]), location: clean(p[2]), propertyType: clean(p[3] || "apartment", 30).toLowerCase() };
  if (p[0] === "listing" && /^[a-z0-9]{10,40}$/i.test(p[1] ?? "")) return { kind: "listing", id: p[1] };
  return null;
}
export function itemKey(i: CompareItem): string {
  return i.kind === "area" ? `area|${i.location}|${i.propertyType}` : i.kind === "project" ? `project|${i.name}|${i.location}|${i.propertyType}` : `listing|${i.id}`;
}

function trueCostFor(pricePerSqft: number, location: string, gst: GstKey | null): CompareResult["trueCost"] {
  const state = stateFromLocation(location);
  if (!state) return null;
  const base = pricePerSqft * REFERENCE_SQFT;
  const tc = computeTrueCost({ state, city: location, basePrice: base, gst: gst ?? "ready" });
  const sr = tc.lines.filter((l) => /stamp|transfer|metro|registration/i.test(l.label)).reduce((a, l) => a + l.amount, 0);
  const g = tc.lines.find((l) => l.label.startsWith("GST"))?.amount ?? 0;
  return {
    sqft: REFERENCE_SQFT, total: tc.total, stampAndRegistration: sr, gst: g,
    gstNote: gst === "under_construction" ? "5% GST (under construction, per source)" : gst === "ready" ? "No GST (ready, per source)" : "GST not included: construction status unknown",
  };
}

const base = (key: string, kind: CompareItem["kind"], title: string, subtitle: string, link: string): CompareResult => ({
  key, kind, title, subtitle, link, price: null, priceText: null, confidence: null, sources: 0, capturedAt: null,
  rera: null, reraNote: "", possession: null, status: null, trueCost: null, trueCostNote: "", missing: null, score: null,
});

export async function compareItem(i: CompareItem): Promise<CompareResult> {
  const key = itemKey(i);

  if (i.kind === "area") {
    const r = base(key, "area", i.location.split(",")[0], `${i.location} · ${i.propertyType} · area average`,
      `/ai-intelligence?area=${encodeURIComponent(i.location.split(",")[0])}&city=${encodeURIComponent(i.location.split(",")[1]?.trim() ?? "")}`);
    r.reraNote = "RERA applies to individual projects, not areas.";
    const m = await getMarketPrice({ location: i.location, propertyType: i.propertyType, tool: "seo_page", cacheOnly: true, skipLog: true }).catch(() => null);
    const hosts = m?.available ? sourceHosts(m.sourceUrls) : [];
    if (!m?.available || !(Number(m.currentPricePerSqft) > 0) || !hosts.length) { r.missing = "No sourced price on record yet. Run a live check."; return r; }
    const unit = unitLabel(String(m.pricePerSqftUnit ?? "sqft"));
    r.price = { value: Number(m.currentPricePerSqft), min: Number(m.priceRangeMin) || null, max: Number(m.priceRangeMax) || null, symbol: String(m.currencySymbol ?? "₹"), unit, label: "Typical asking price (AI estimate)" };
    r.confidence = (m.confidence as { level?: string } | undefined)?.level ?? null;
    r.sources = hosts.length;
    r.capturedAt = m.fetchedAt ? String(m.fetchedAt) : null;
    if (String(m.pricePerSqftUnit ?? "sqft") === "sqft" && r.price.symbol.trim() === "₹") r.trueCost = trueCostFor(r.price.value, i.location, null);
    r.trueCostNote = r.trueCost ? "" : r.price.symbol.trim() === "₹" ? "Add the city to calculate stamp duty for the right state." : "True cost is calculated for homes in India priced per sq.ft.";
    return r;
  }

  if (i.kind === "project") {
    const r = base(key, "project", i.name, `${i.location} · ${i.propertyType} · project`,
      `/price-check?location=${encodeURIComponent(i.location)}&project=${encodeURIComponent(i.name)}#project`);
    const p = await findCachedProject(i.name, i.location, i.propertyType);
    if (!p?.found) { r.missing = "Not checked yet. Run a live Project Check first."; return r; }
    r.title = p.name;
    if (p.facts.reraNumber) r.rera = { number: p.facts.reraNumber.value, note: "Stated by a source; not verified by PropKnown. Check it on the RERA portal.", sourceUrl: p.facts.reraNumber.sourceUrl };
    r.reraNote = r.rera ? "" : "No RERA number found in a source. Check the RERA portal.";
    r.possession = p.facts.possession?.value ?? null;
    r.status = p.facts.status?.value ?? null;
    if (!p.price || !p.price.sources.length) { r.missing = "Project found, but no dated asking price yet."; return r; }
    r.price = { value: p.price.median, min: p.price.min, max: p.price.max, symbol: p.price.currency === "INR" ? "₹" : `${p.price.currency} `, unit: "sq.ft", label: "Asking price (median of listings)" };
    r.confidence = p.confidence?.level ?? null;
    r.sources = sourceSiteCount(p.price);
    r.capturedAt = p.price.capturedAt;
    const gst: GstKey | null = /under\s*construction|ongoing|new launch/i.test(r.status ?? "") ? "under_construction" : /ready|completed|resale/i.test(r.status ?? "") ? "ready" : null;
    // State from the area typed, or the location a source gives (e.g. "Bachupally, Hyderabad").
    if (p.price.currency === "INR") r.trueCost = trueCostFor(p.price.median, `${i.location} ${p.facts.location?.value ?? ""}`, gst);
    r.trueCostNote = r.trueCost ? "" : p.price.currency === "INR" ? "Add the city (e.g. \"Bachupally, Hyderabad\") to calculate stamp duty for the right state." : "True cost is calculated for homes in India.";
    return r;
  }

  const s = await prisma.propertySubmission.findUnique({ where: { id: i.id } }).catch(() => null);
  const r = base(key, "listing", s?.title ?? "Listing", s ? `${s.area}, ${s.city} · ${s.propType} · owner listing` : "", `/buy/submission/${i.id}`);
  if (!s || s.status !== "approved") { r.missing = "Listing not found or not public."; return r; }
  r.priceText = s.priceDisplay ? `${s.priceDisplay} (owner's asking price)` : null;
  const badge = reraBadge({ reraNumber: s.reraNumber, flags: s.verificationFlags as never, location: `${s.area}, ${s.city}` });
  if (badge) r.rera = { number: badge.number, note: `Verified by PropKnown · ${badge.sourceLabel}`, sourceUrl: badge.sourceUrl };
  r.reraNote = r.rera ? "" : "RERA not verified by PropKnown for this listing.";
  r.possession = s.expectedCompletion ?? null;
  r.trueCostNote = "Use the True Cost calculator with this listing's final price.";
  return r;
}

export async function compareItems(items: CompareItem[]): Promise<CompareResult[]> {
  const unique = Array.from(new Map(items.map((i) => [itemKey(i).toLowerCase(), i])).values()).slice(0, MAX_COMPARE);
  return Promise.all(unique.map(async (i) => {
    const r = await compareItem(i);
    if (FEATURES.investmentScore && i.kind !== "listing") {
      const s = await scoreFor(i.location, i.propertyType, i.kind === "project" ? i.name : null).catch(() => null);
      if (s) r.score = { score: s.score, band: s.band, basedOn: s.basedOn };
    }
    return r;
  }));
}
