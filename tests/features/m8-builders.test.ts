// M8 builder profiles / trust score -- pure rules. Run: npm run test:features
import { test } from "node:test";
import assert from "node:assert/strict";
import { builderSlug, groupBuilders, trustScore } from "@/lib/builders";

const row = (name: string, builder: string, rera: string | null) => ({ fetchedAt: new Date("2026-11-10"), data: { found: true, name, query: { area: "Bachupally" }, facts: { builder: { value: builder, sourceUrl: "https://example.com/p" }, ...(rera ? { reraNumber: { value: rera, sourceUrl: "x" } } : {}) }, price: null } });

test("slug ignores company suffixes", () => {
  assert.equal(builderSlug("Sanvi Infra Projects Pvt. Ltd."), "sanvi");
  assert.equal(builderSlug("Aparna Constructions and Estates Pvt Ltd"), "aparna-and-estates");
});
test("groups projects under one builder across spellings", () => {
  const g = groupBuilders([row("A Towers", "Sanvi Infra Projects Pvt. Ltd.", "P1"), row("B Heights", "Sanvi Infra Projects Pvt Ltd", null), row("C", "Other Builders", null), { fetchedAt: new Date(), data: { found: false } }]);
  assert.equal(g.length, 2);
  assert.equal(g[0].projects.length, 2);
});
test("trust score refuses to score without enough verified factors", () => {
  const [b] = groupBuilders([row("A", "X Constructions", "P1"), row("B", "X Constructions", null)]);
  const t = trustScore(b);
  assert.equal(t.score, null);
  assert.match(t.basedOn, /Not enough verified data \(1 of 4/);
  assert.equal(t.factors.find((f) => f.key === "reraDisclosure")!.points, 50);
});

test("same RERA number = same project (spelling variants)", () => {
  const [b] = groupBuilders([row("Kousalya Manidweepam", "Sanvi Infra Projects Pvt. Ltd.", "P02200002912"), row("Kowsalya Manidweepam", "Sanvi Infra Projects Pvt. Ltd.", "P02200002912")]);
  assert.equal(b.projects.length, 1);
});

test("the best-sourced spelling wins the merge", () => {
  const weak = row("Kousalya Manidweepam", "Sanvi Infra Projects Pvt. Ltd.", "P02200002912");
  const strong = row("Kowsalya Manidweepam", "Sanvi Infra Projects Pvt. Ltd.", "P02200002912");
  (strong.data as { price: unknown }).price = { min: 1, max: 2, sources: [{ host: "a.com" }, { host: "b.com" }] };
  const [b] = groupBuilders([weak, strong]);
  assert.equal(b.projects[0].name, "Kowsalya Manidweepam");
});
