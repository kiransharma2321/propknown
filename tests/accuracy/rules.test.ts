// Accuracy test suite — pure rules (no database, no network). Run: npm run test:accuracy
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { sourceHosts, isPriceSource } from "@/lib/engine/sources";
import { computeConfidence } from "@/lib/engine/confidence";
import { reraBadge } from "@/lib/listings/rera";
import { DEFAULT_CALLBACK_TEXT } from "@/lib/siteSettings";

// (a) Non-source hosts are never counted as price sources; no sources -> Low, never published.
test("a: tavily/tracxn/social hosts are not price sources", () => {
  for (const u of ["https://tavily.com/x", "https://www.tracxn.com/y", "https://instagram.com/p", "https://leadiq.com/z"]) assert.equal(isPriceSource(u), false, u);
  assert.deepEqual(sourceHosts(["https://www.tavily.com", "https://tracxn.com", "https://www.99acres.com/k", "https://housing.com/a"]), ["99acres.com", "housing.com"]);
});
test("a: a price with no real sources is Low confidence ('Sources unavailable')", () => {
  const c = computeConfidence({ sourceUrls: ["https://tavily.com", "https://tracxn.com"], currentPricePerSqft: 9200, fetchedAt: new Date().toISOString() });
  assert.equal(c.level, "Low");
});

// (b) RERA badge only when verified, always with number + where to check it.
test("b: owner-entered RERA number alone gives no badge", () => {
  assert.equal(reraBadge({ reraNumber: "P02400007234", flags: {}, location: "Kokapet Hyderabad" }), null);
  assert.equal(reraBadge({ reraNumber: "P02400007234", flags: { reraVerified: false }, location: "Kokapet Hyderabad" }), null);
});
test("b: verified RERA shows number and the TG RERA portal", () => {
  const b = reraBadge({ reraNumber: "P02400007234", flags: { reraVerified: true }, location: "Kokapet Hyderabad" });
  assert.ok(b);
  assert.equal(b!.number, "P02400007234");
  assert.match(b!.sourceUrl ?? "", /rera\.telangana\.gov\.in/);
});

// (c) No hardcoded call-back time promises; the default is the agreed wording.
test("c: default call-back text", () => assert.equal(DEFAULT_CALLBACK_TEXT, "We'll call you back soon."));
test("c: no 'within 2 hours' promise anywhere in pages/components", () => {
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) { if (f !== "node_modules" && !f.startsWith(".")) walk(p); continue; }
      if (/\.(tsx?|md)$/.test(f) && /within\s+(2|two)\s+h(ou)?rs?/i.test(readFileSync(p, "utf8"))) hits.push(p);
    }
  };
  walk("app"); walk("components");
  assert.deepEqual(hits, []);
});

// M1: two pages on the same portal are one source, not two.
test("m1: project source count = distinct websites", async () => {
  const { sourceSiteCount } = await import("@/lib/projects/sites");
  const n = sourceSiteCount({ sources: [
    { host: "nobroker.in", url: "https://www.nobroker.in/a" },
    { host: "magicbricks.com", url: "https://www.magicbricks.com/a" },
    { host: "magicbricks.com", url: "https://www.magicbricks.com/b" },
  ] });
  assert.equal(n, 2);
});

// M1: the project median is taken per website first, so one portal can't outvote the rest.
test("m1: per-site median", async () => {
  const { medianOf } = await import("@/lib/projects/sites");
  const perSite = [medianOf([8000, 8200, 8235]), medianOf([6800])];
  assert.equal(medianOf(perSite), 7500);
});

// Kowsalya Manidweepam (Nov 2026): listing pages mixed the builder price with resale flats and a
// registry rate. Figures as extracted from the real search results on 11 Nov 2026.
test("project price uses builder figures; resale and registry rates are kept out", async () => {
  const { pickProjectPrices } = await import("@/lib/projects/sites");
  const f = (value: number, host: string, listingType?: string, basis?: string, kind?: string) => ({ value, host, url: `https://${host}/x`, listingType, basis, kind });
  const pick = pickProjectPrices([
    f(7814, "nobroker.in", "unknown"), f(7131, "magicbricks.com", "unknown"),
    f(2500, "99acres.com", "unknown", "unknown", "registered"),
    f(7037, "nobroker.in", "resale", "built_up"), f(8831, "nobroker.in", "resale", "built_up"),
    f(6274, "proptiger.com", "builder", "built_up"), f(6800, "proplocators.com", "builder"), f(6800, "propertypistol.com", "builder", "built_up"),
  ]);
  assert.equal(pick.primaryKind, "builder");
  assert.deepEqual(pick.primary.map((p) => p.value).sort(), [6274, 6800, 6800]);
  assert.deepEqual(pick.resale.map((p) => p.value).sort(), [7037, 8831]);
  assert.ok(pick.dropped.some((d) => d.value === 2500 && /registered/.test(d.reason)));
});
test("carpet-area rates are left out when built-up rates exist", async () => {
  const { pickProjectPrices } = await import("@/lib/projects/sites");
  const pick = pickProjectPrices([{ value: 6500, host: "a.com", url: "https://a.com", listingType: "builder", basis: "built_up" }, { value: 8200, host: "b.com", url: "https://b.com", listingType: "builder", basis: "carpet" }]);
  assert.deepEqual(pick.primary.map((p) => p.value), [6500]);
});

// General rules used by the broad suite (lib/accuracyRules.ts).
test("rules: a clean price passes; each kind of error is caught", async () => {
  const { checkPrice } = await import("@/lib/accuracyRules");
  const ok = { kind: "area" as const, location: "Kokapet, Hyderabad", price: 12000, min: 8500, max: 17500, currency: "INR", unit: "sqft", sourceUrls: ["https://www.99acres.com/a", "https://squareyards.com/b", "https://www.magicbricks.com/c"], confidence: "High", capturedAt: "2026-11-10T00:00:00Z", claimedSources: 3 };
  assert.deepEqual(checkPrice(ok, Date.parse("2026-11-11")), []);
  const rules = (o: object) => checkPrice({ ...ok, ...o }, Date.parse("2026-11-11")).map((f) => f.rule);
  assert.ok(rules({ sourceUrls: [] }).includes("has a real source"));
  assert.ok(rules({ sourceUrls: [...ok.sourceUrls, "https://tavily.com/x"] }).includes("only real sources"));
  assert.ok(rules({ min: 13000 }).includes("min <= price <= max"));
  assert.ok(rules({ price: 120 }).includes("plausible for currency + unit"));
  assert.ok(rules({ location: "Business Bay, Dubai" }).includes("currency matches the country"));
  assert.ok(rules({ sourceUrls: ["https://www.99acres.com/a"], claimedSources: 1 }).includes("High confidence needs 3+ websites"));
  assert.ok(rules({ claimedSources: 5 }).includes("source count = distinct websites"));
  assert.ok(rules({ capturedAt: "2027-01-01" }).includes("capture date not in the future"));
  assert.ok(checkPrice({ ...ok, kind: "project", localityPrice: 3000 }, Date.parse("2026-11-11")).some((f) => f.rule === "project vs its area within reason"));
});

test("engine plausibility: implausible prices and absurd ranges are never published", async () => {
  const { isPlausiblePrice, isUsableRange } = await import("@/lib/engine/plausibility");
  assert.equal(isPlausiblePrice(800, "INR", "sqft"), false, "villa at Rs 800/sqft is a rent or unit mix-up");
  assert.equal(isPlausiblePrice(104_400, "INR", "sqyard"), true);
  assert.equal(isPlausiblePrice(15_675_066_00, "INR", "acres"), false, "Rs 156 crore per acre is not farm land");
  assert.equal(isPlausiblePrice(189_240, "AED", "acres"), false);
  assert.equal(isUsableRange(11_346, 920, 33_333), false, "36x range");
  assert.equal(isUsableRange(8_650, 7_000, 10_500), true);
  assert.equal(isUsableRange(8_650, 9_000, 10_500), false, "price outside its own range");
});

test("listings: no approval number -> 'Approval details pending'; unverified number is never 'Approved'", async () => {
  const { approvalLabel } = await import("@/lib/listings/rera");
  assert.deepEqual(approvalLabel({ reraNumber: "", flags: {}, location: "Shadnagar Hyderabad" }), { text: "Approval details pending", verified: false });
  const given = approvalLabel({ reraNumber: "P02400007234", flags: {}, location: "Kokapet Hyderabad" });
  assert.equal(given.verified, false);
  assert.match(given.text, /not yet verified/);
  assert.doesNotMatch(given.text, /approved/i);
  assert.equal(approvalLabel({ reraNumber: "P02400007234", flags: { reraVerified: true }, location: "Kokapet Hyderabad" }).text, "✓ RERA P02400007234");
});
