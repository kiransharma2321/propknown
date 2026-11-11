// General accuracy rules applied to EVERY stored price (areas and projects). Nothing here is
// special-cased for a particular project. Pure functions so they can be unit-tested and reused
// by the broad accuracy suite (tests/accuracy/broad.test.ts).
import { isPriceSource } from "@/lib/engine/sources";
import { plausibleBand, MAX_RANGE_RATIO } from "@/lib/engine/plausibility";

export interface RuleFailure { rule: string; detail: string }
const COUNTRY_CURRENCY: [RegExp, string][] = [
  [/dubai|abu dhabi|sharjah|uae/i, "AED"], [/london|united kingdom|\buk\b/i, "GBP"], [/singapore/i, "SGD"], [/toronto|canada/i, "CAD"],
  [/hyderabad|bengaluru|bangalore|mumbai|pune|chennai|delhi|gurugram|noida|kolkata|ahmedabad|kochi|india|thane/i, "INR"],
];

export function expectedCurrency(location: string): string | null {
  return COUNTRY_CURRENCY.find(([re]) => re.test(location))?.[1] ?? null;
}

const hosts = (urls: string[]) => Array.from(new Set(urls.map((u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } })));

export interface PriceUnderTest {
  kind: "area" | "project";
  location: string;               // "Kokapet, Hyderabad" or project area
  price: number; min?: number | null; max?: number | null;
  currency: string; unit: string; // "INR" / "sqft"
  sourceUrls: string[];
  confidence?: string | null;
  capturedAt?: string | null;
  claimedSources?: number | null; // what the UI says ("3 websites")
  basis?: string | null;          // projects: builder | listings | resale
  localityPrice?: number | null;  // projects: the area's typical price
}

export function checkPrice(p: PriceUnderTest, now = Date.now()): RuleFailure[] {
  const f: RuleFailure[] = [];
  const real = p.sourceUrls.filter(isPriceSource);
  const sites = hosts(real);
  if (!sites.length) f.push({ rule: "has a real source", detail: "no real source behind a published price" });
  if (real.length !== p.sourceUrls.length) f.push({ rule: "only real sources", detail: `${p.sourceUrls.length - real.length} non-price source(s) kept` });
  if (p.min != null && p.max != null) {
    if (!(p.min <= p.price && p.price <= p.max)) f.push({ rule: "min <= price <= max", detail: `${p.min} / ${p.price} / ${p.max}` });
    if (p.min > 0 && p.max / p.min > MAX_RANGE_RATIO) f.push({ rule: "range not absurdly wide", detail: `max is ${(p.max / p.min).toFixed(1)}x min` });
  }
  const band = plausibleBand(p.currency, p.unit);
  if (!band) f.push({ rule: "known currency + unit", detail: `${p.currency}/${p.unit}` });
  else if (p.price < band[0] || p.price > band[1]) f.push({ rule: "plausible for currency + unit", detail: `${p.currency} ${p.price}/${p.unit} outside ${band[0]}-${band[1]}` });
  const exp = expectedCurrency(p.location);
  if (exp && exp !== p.currency) f.push({ rule: "currency matches the country", detail: `${p.location} priced in ${p.currency}, expected ${exp}` });
  if (p.confidence === "High" && sites.length < 3) f.push({ rule: "High confidence needs 3+ websites", detail: `${sites.length} website(s)` });
  if (p.claimedSources != null && p.claimedSources !== sites.length) f.push({ rule: "source count = distinct websites", detail: `claims ${p.claimedSources}, has ${sites.length}` });
  if (p.capturedAt) {
    const t = new Date(p.capturedAt).getTime();
    if (!Number.isFinite(t)) f.push({ rule: "has a valid capture date", detail: String(p.capturedAt) });
    else if (t > now + 86_400_000) f.push({ rule: "capture date not in the future", detail: p.capturedAt });
  } else f.push({ rule: "has a capture date", detail: "missing" });
  if (p.kind === "project") {
    if (p.basis && !["builder", "listings", "resale"].includes(p.basis)) f.push({ rule: "price basis labelled", detail: p.basis });
    if (p.localityPrice && p.localityPrice > 0) {
      const pct = ((p.price - p.localityPrice) / p.localityPrice) * 100;
      if (pct > 200 || pct < -75) f.push({ rule: "project vs its area within reason", detail: `${Math.round(pct)}% vs area ${p.localityPrice}` });
    }
  }
  return f;
}
