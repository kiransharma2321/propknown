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

// M1: every cached project price is internally consistent -- a real source for each figure,
// min <= median <= max, and "N sources" counts distinct websites, not pages on one portal.
test("m1: cached project prices are sourced and internally consistent", async () => {
  const { prisma } = await import("@/lib/db");
  const { isPriceSource } = await import("@/lib/engine/sources");
  const { sourceSiteCount } = await import("@/lib/projects/sites");
  const rows = await prisma.locationMarketCache.findMany({ where: { locationKey: { startsWith: "project/" } }, select: { id: true, data: true } });
  const bad: string[] = [];
  for (const r of rows) {
    const p = (r.data as { price?: { min: number; max: number; median: number; sources: { host: string; url: string }[] } | null }).price;
    if (!p) continue;
    if (!p.sources.length || !p.sources.every((s) => isPriceSource(s.url))) bad.push(`${r.id}: unsourced`);
    if (!(p.min <= p.median && p.median <= p.max)) bad.push(`${r.id}: min/median/max out of order`);
    if (sourceSiteCount(p) > p.sources.length) bad.push(`${r.id}: site count`);
  }
  assert.deepEqual(bad, []);
});

// Kowsalya Manidweepam (checked 11 Nov 2026): independent sources put the builder price at about
// Rs 6,200-6,800/sq.ft (squareyards, roofandfloor, propertypistol, proptiger). Our stored price
// must be the builder price and stay within that band; resale listings are kept separate.
test("m1: Kowsalya Manidweepam shows the builder price, not resale listings", async () => {
  const { findCachedProject } = await import("@/lib/projects");
  const p = await findCachedProject("Kowsalya Manidweepam", "Bachupally");
  if (!p?.price) return; // no stored check is an honest outcome
  if (p.price.basis) assert.equal(p.price.basis, "builder");
  assert.ok(p.price.max <= 7200, `max Rs ${p.price.max}/sq.ft looks like resale listings`);
  assert.ok(p.price.min >= 5500, `min Rs ${p.price.min}/sq.ft is below the builder band`);
});
