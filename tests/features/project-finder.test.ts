// Auto Project Finder: duplicate rule + drafts carry only sourced facts. Run: npm run test:features
import { test } from "node:test";
import assert from "node:assert/strict";
import { sameProject, draftFromCheck } from "@/lib/listings/finder";
import type { ProjectResult } from "@/lib/projects";

test("same project name + builder is one draft; a missing builder matches", () => {
  assert.equal(sameProject({ projectName: "My Home Bhooja", builder: "My Home" }, { projectName: "my home  bhooja", builder: "MY HOME" }), true);
  assert.equal(sameProject({ projectName: "My Home Bhooja", builder: null }, { projectName: "My Home Bhooja", builder: "My Home" }), true);
  assert.equal(sameProject({ projectName: "Sky Towers", builder: "A Builders" }, { projectName: "Sky Towers", builder: "B Developers" }), false);
});

test("a draft from a project check has no price and no unverified 'approved' claim", () => {
  const p = { found: true, name: "Test Heights", query: { name: "Test Heights", area: "Kokapet, Hyderabad", propertyType: "apartment" }, facts: {},
    price: { min: 9000, max: 10000, median: 9500, unit: "sqft", currency: "INR", sources: [{ host: "a.com", url: "https://a.com/x" }, { host: "b.com", url: "https://b.com/y" }], capturedAt: "2026-11-10T00:00:00Z", basis: "builder" },
    confidence: null, locality: null, verdict: null, cached: true, capturedAt: "2026-11-10T00:00:00Z" } as unknown as ProjectResult;
  const d = draftFromCheck(p)!;
  assert.equal(d.price, null);
  assert.equal(d.reraNumber, null);
  assert.match(d.description, /Approval details pending/);
  assert.match(d.description, /https:\/\/a\.com\/x/);
  assert.equal(d.city, "Hyderabad");
  assert.equal(draftFromCheck({ ...p, price: null } as ProjectResult), null, "no sourced price -> no draft");
});
