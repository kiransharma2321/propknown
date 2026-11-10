// Accuracy test suite — live data checks against the database (cache only, no paid AI calls).
// Needs DATABASE_URL. Run: npm run test:accuracy
import { test } from "node:test";
import assert from "node:assert/strict";
import { allAreaPages, getAreaPrices, areaPagesWithData } from "@/lib/areaPages";

// (a) Every price an area page publishes has at least one real source; pages without one are
// shown as "not enough data" and are not in the sitemap.
test("a: no area page publishes a price without real sources", async () => {
  const bad: string[] = [];
  for (const page of allAreaPages()) {
    for (const t of await getAreaPrices(page)) if (t.price && t.sources.length === 0) bad.push(`${page.area} ${t.type}`);
  }
  assert.deepEqual(bad, []);
});
test("a: sitemap area pages all have a sourced price", async () => {
  const listed = new Set((await areaPagesWithData()).map((p) => p.path));
  for (const page of allAreaPages()) {
    const priced = (await getAreaPrices(page)).some((t) => t.price && t.sources.length > 0);
    if (listed.has(`/ai-intelligence/${page.citySlug}/${page.areaSlug}`)) assert.ok(priced, `${page.area} is in the sitemap without a sourced price`);
  }
});
test("a: Kokapet apartment price is sourced and within a sane band", async () => {
  const page = allAreaPages().find((p) => p.areaSlug === "kokapet")!;
  const apt = (await getAreaPrices(page)).find((t) => t.type === "apartment");
  if (!apt?.price) return; // "not enough data" is an acceptable, honest outcome
  assert.ok(apt.sources.length > 0);
  assert.ok(apt.price >= 6000 && apt.price <= 25000, `Kokapet apartment ₹${apt.price}/sq.ft is outside the sanity band`);
});
