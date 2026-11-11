// Auto Listing Researcher: pure rules (no network / database) so every rule is unit-tested.
// Facts only, each tied to the source that states it; descriptions are written by us from those
// facts; individual resale sellers and anyone's contact details are never collected.

export const RESEARCH_CITIES = ["Hyderabad", "Bengaluru", "Pune", "Mumbai", "Chennai", "Dubai"] as const;
export type ResearchCategory = "apartment" | "villa" | "plot_layout" | "farmland" | "commercial";
export const CATEGORIES: { id: ResearchCategory; label: string; propertyType: string }[] = [
  { id: "apartment", label: "apartment project", propertyType: "apartment" },
  { id: "villa", label: "villa project", propertyType: "villa" },
  { id: "plot_layout", label: "plotted layout", propertyType: "plot" },
  { id: "farmland", label: "farmland / agricultural venture", propertyType: "agriculture" },
  { id: "commercial", label: "commercial project", propertyType: "commercial" },
];

const YEAR = () => new Date().getFullYear();
// Plot approvals differ by state; the queries use the local authority names.
const PLOT_AUTH: Record<string, string> = { Hyderabad: "HMDA DTCP", Bengaluru: "BDA BMRDA DTCP", Pune: "PMRDA", Mumbai: "MMRDA", Chennai: "DTCP CMDA", Dubai: "DLD" };

export function researchQueries(city: string, cat: ResearchCategory): string[] {
  const y = YEAR(), rera = city === "Dubai" ? "DLD RERA" : "RERA";
  switch (cat) {
    case "apartment": return [`new launch apartments ${city} ${rera} price per sq ft possession ${y}`, `under construction apartment projects for sale ${city} ${y} builder ${rera} number`];
    case "villa": return [`new villa projects for sale ${city} ${y} ${rera} price`, `gated community villas ${city} under construction ${y} builder`];
    case "plot_layout": return [`${PLOT_AUTH[city] ?? "DTCP"} approved open plots layout for sale ${city} ${y} price per sq yd`, `new plotted development venture ${city} ${y} ${rera} approved plots`];
    case "farmland": return [`farmland managed farm plots venture near ${city} ${y} price per sq yd`, `agricultural land venture for sale near ${city} ${y} farm plots`];
    case "commercial": return [`new commercial office retail project for sale ${city} ${y} ${rera}`, `pre-leased commercial space new launch ${city} ${y} price per sq ft`];
  }
}

// Never collect individual resale sellers: classifieds, owner-listing pages and resale paths are
// excluded before anything is fetched. Resale stock comes via /list-property and the broker portal.
const RESALE_HOSTS = /(^|\.)(olx\.in|quikr\.com|facebook\.com|instagram\.com|nobroker\.in|sulekha\.com|justdial\.com|commonfloor\.com\/listing|clickindia\.com|bayut\.com\/property\/details|dubizzle\.com|propertyfinder\.ae\/en\/plp)/i;
const RESALE_PATH = /resale|by-owner|owner-property|\/owner\/|individual|rent(al)?[-/]|for-rent|pg-|\/pg\/|classified/i;
export function isResaleOrSellerPage(url: string): boolean {
  try { const u = new URL(url); return RESALE_HOSTS.test(u.hostname + u.pathname) || RESALE_PATH.test(u.pathname); } catch { return true; }
}

// Phone numbers and emails are removed from page text BEFORE the AI sees it, so no one's contact
// details can be extracted or stored.
export function redactContacts(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]")
    // International numbers (+971 ..., +44 ...) and Indian mobiles / +91 numbers. Not preceded by
    // a letter or "/", so RERA / LP numbers like P02400007234 or PRM/KA/RERA/... are kept.
    .replace(/(?<![A-Za-z0-9/])\+\d{1,3}[\s-]?\d[\d\s-]{7,}\d/g, "[phone removed]")
    .replace(/(?<![A-Za-z0-9/+])(?:0|91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g, "[phone removed]")
    .replace(/(?<![A-Za-z0-9/])0\d{2,4}[\s-]\d{6,8}(?!\d)/g, "[phone removed]");
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
const digits = (s: string) => s.replace(/[^0-9]/g, "");

// A fact is kept only if the cited source text actually contains it: IDs/numbers by their digits,
// words by all their significant tokens. Anything the AI "added" is dropped.
export function supportedBy(value: string | number, text: string): boolean {
  const v = String(value).trim();
  if (!v) return false;
  const t = norm(text);
  if (typeof value === "number" || /^[\d,.\s]+$/.test(v)) {
    const n = Number(String(v).replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0) return false;
    const indian = n.toLocaleString("en-IN"), intl = n.toLocaleString("en-US");
    return text.includes(indian) || text.includes(intl) || text.includes(String(n));
  }
  if (/[a-z]/i.test(v) && digits(v).length >= 4 && !/\s[a-z]{4,}\s/i.test(` ${v} `)) { // approval / RERA numbers
    const compact = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return compact(text).includes(compact(v));
  }
  const tokens = norm(v).split(" ").filter((w) => w.length > 2 && !["the", "and", "pvt", "ltd", "private", "limited", "llp"].includes(w));
  return tokens.length > 0 && tokens.every((w) => t.includes(w));
}

export type FactKey = "name" | "builder" | "builderLegalName" | "location" | "approvalType" | "approvalNumber" | "configurations" | "sizes" | "pricePerUnit" | "totalPrice" | "priceUnit" | "areaBasis" | "possession" | "status" | "builderWebsite";
export interface Fact { value: string; sourceUrl: string; capturedAt: string }
export type Facts = Partial<Record<FactKey, Fact[]>>;

// A per-unit price must be ONE plain number ("6,800"). Totals ("85 L", "3.58 Cr") and ranges
// ("3.58 Cr - 3.64 Cr") are total prices: kept as "totalPrice", never compared per sq ft.
export function perUnitNumber(v: string): number | null {
  const s = v.trim();
  if (/cr|crore|lakh|lac|\bl\b|million|mn|\bk\b|–|—|\bto\b|-\s*\d/i.test(s)) return null;
  const n = Number(s.replace(/[₹,\s]|rs\.?|aed|inr/gi, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const REQUIRED: FactKey[] = ["name", "builder", "location", "approvalNumber", "configurations", "possession", "status"];

// Two sources disagree on a key fact -> conflict (shown to the reviewer, lowers confidence).
export function conflicts(f: Facts): string[] {
  const out: string[] = [];
  for (const k of ["approvalNumber", "possession", "builderLegalName"] as FactKey[]) {
    const vals = Array.from(new Set((f[k] ?? []).map((x) => norm(x.value))));
    if (vals.length > 1) out.push(`${k}: sources disagree (${(f[k] ?? []).map((x) => x.value).join(" vs ")})`);
  }
  const prices = (f.pricePerUnit ?? []).map((x) => perUnitNumber(x.value)).filter((n): n is number => !!n);
  if (prices.length > 1 && Math.max(...prices) / Math.min(...prices) > 1.35) out.push(`price: sources differ by more than 35% (${prices.join(" vs ")})`);
  return out;
}

export function missingFields(f: Facts): string[] {
  const m: string[] = REQUIRED.filter((k) => !(f[k]?.length));
  if (!f.pricePerUnit?.length && !f.totalPrice?.length) m.push("price");
  return m;
}

const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

// 0-100. Rewards independent sources and stated approvals; penalises conflicts, missing facts,
// a price far from the area, and duplicates are flagged separately.
export function confidenceScore(f: Facts, o: { priceVsArea?: "within" | "outside" | "no_data"; conflictCount: number }): number {
  const hosts = new Set(Object.values(f).flat().map((x) => hostOf(x!.sourceUrl))).size;
  let s = hosts >= 3 ? 45 : hosts === 2 ? 35 : hosts === 1 ? 20 : 0;
  if (f.approvalNumber?.length) s += 15;
  if (f.pricePerUnit?.length || f.totalPrice?.length) s += 10;
  if (o.priceVsArea === "within") s += 10; else if (o.priceVsArea === "outside") s -= 10;
  for (const k of ["builder", "configurations", "possession", "builderWebsite"] as FactKey[]) if (f[k]?.length) s += 5;
  if (f.status?.length) s += 5;
  s -= Math.min(30, o.conflictCount * 15);
  return Math.max(0, Math.min(100, s));
}
export const HIGH_CONFIDENCE = 75;

// Description in OUR words, built only from the verified facts (never copied page text).
export function describe(f: Facts, cat: ResearchCategory, city: string): string {
  const v = (k: FactKey) => f[k]?.[0]?.value;
  const label = CATEGORIES.find((c) => c.id === cat)?.label ?? "project";
  const parts = [`${v("name")} is ${/^[aeiou]/i.test(label) ? "an" : "a"} ${label}${v("builder") ? ` by ${v("builder")}` : ""} in ${v("location") ?? city}.`];
  if (v("configurations") || v("sizes")) parts.push(`It offers ${[v("configurations"), v("sizes") ? `sizes of ${v("sizes")}` : null].filter(Boolean).join(", ")}.`);
  if (v("status") || v("possession")) parts.push(`Status: ${[v("status"), v("possession") ? `possession ${v("possession")}` : null].filter(Boolean).join(", ")}.`);
  parts.push(v("approvalNumber") ? `Approval: ${v("approvalType") ?? "number"} ${v("approvalNumber")}, as stated by the source; to be verified on the official portal.` : "Approval details pending.");
  parts.push("All facts are from the linked public sources on the dates shown.");
  return parts.join(" ");
}

export function priceLabel(f: Facts, currency: string): string | null {
  const p = f.pricePerUnit?.[0];
  const t = f.totalPrice?.[0];
  if (!p && t) return `${t.value} (total price as stated by ${hostOf(t.sourceUrl)} on ${new Date(t.capturedAt).toLocaleDateString("en-IN")})`;
  if (!p) return null;
  const unit = f.priceUnit?.[0]?.value ?? "sq ft", basis = f.areaBasis?.[0]?.value;
  const sym = currency === "INR" ? "₹" : `${currency} `;
  return `${sym}${p.value} per ${unit}${basis ? ` (${basis})` : ""}, as stated by ${hostOf(p.sourceUrl)} on ${new Date(p.capturedAt).toLocaleDateString("en-IN")}`;
}
