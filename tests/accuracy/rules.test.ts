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
