// Broad accuracy suite: the general engine rules (lib/accuracyRules.ts) applied to EVERY stored
// area and project price -- 30+ real projects and 30+ areas across cities, countries and property
// types (populate with scripts/accuracy-populate.ts). Nothing is special-cased.
// Run: npm run test:accuracy   (needs DATABASE_URL)
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPrice, type PriceUnderTest } from "@/lib/accuracyRules";
import { sourceSiteCount } from "@/lib/projects/sites";
import { allAreaPages, getAreaPrices } from "@/lib/areaPages";

type ProjectRow = { found?: boolean; name?: string; query?: { area?: string }; price?: { min: number; max: number; median: number; currency: string; unit: string; sources: { host: string; url: string }[]; capturedAt: string; basis?: string } | null; confidence?: { level?: string } | null; locality?: { price: number } | null };

export async function collectPrices(): Promise<{ label: string; p: PriceUnderTest }[]> {
  const { prisma } = await import("@/lib/db");
  const { getMarketPrice } = await import("@/lib/engine");
  const out: { label: string; p: PriceUnderTest }[] = [];
  const rows = await prisma.locationMarketCache.findMany({ select: { locationKey: true, locationName: true, propertyType: true, data: true } });
  for (const r of rows) {
    if (r.locationKey.startsWith("project/")) {
      const d = r.data as ProjectRow;
      if (!d?.found || !d.price) continue;
      out.push({ label: `project · ${d.name} (${d.query?.area})`, p: {
        kind: "project", location: d.query?.area ?? r.locationName, price: d.price.median, min: d.price.min, max: d.price.max,
        currency: d.price.currency, unit: d.price.unit, sourceUrls: d.price.sources.map((s) => s.url), confidence: d.confidence?.level ?? null,
        capturedAt: d.price.capturedAt, claimedSources: sourceSiteCount(d.price), basis: d.price.basis ?? null, localityPrice: d.locality?.price ?? null,
      } });
    } else {
      // Areas: read through the engine exactly as the site does (it drops unsourced prices).
      const m = await getMarketPrice({ location: r.locationName, propertyType: r.propertyType, tool: "seo_page", cacheOnly: true, skipLog: true }).catch(() => null);
      if (!m?.available || !(Number(m.currentPricePerSqft) > 0)) continue;
      out.push({ label: `area · ${r.locationName} · ${r.propertyType}`, p: {
        kind: "area", location: r.locationName, price: Number(m.currentPricePerSqft), min: Number(m.priceRangeMin) || null, max: Number(m.priceRangeMax) || null,
        currency: String(m.currency ?? "INR"), unit: String(m.pricePerSqftUnit ?? "sqft"), sourceUrls: (m.sourceUrls as string[]) ?? [],
        confidence: (m.confidence as { level?: string } | undefined)?.level ?? null, capturedAt: m.fetchedAt ? String(m.fetchedAt) : null,
      } });
    }
  }
  return out;
}

test("broad: every stored area and project price passes the general rules", async () => {
  const all = await collectPrices();
  const projects = all.filter((x) => x.p.kind === "project").length, areas = all.length - projects;
  assert.ok(projects >= 30, `only ${projects} priced projects stored (need 30+; run scripts/accuracy-populate.ts)`);
  assert.ok(areas >= 30, `only ${areas} priced areas stored (need 30+)`);
  const failures = all.flatMap((x) => checkPrice(x.p).map((f) => `${x.label}: ${f.rule} -- ${f.detail}`));
  assert.deepEqual(failures, []);
});

test("broad: area pages never publish an unsourced price", async () => {
  const bad: string[] = [];
  for (const page of allAreaPages()) for (const t of await getAreaPrices(page)) if (t.price && !t.sources.length) bad.push(`${page.area} ${t.type}`);
  assert.deepEqual(bad, []);
});
