// M2 (My PropKnown) -- pure rules. Run: npx tsx --test tests/features/*.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { watchKey, shouldAlert, changePct, normaliseWatch } from "@/lib/priceWatch";
import { validSearchPath } from "@/lib/savedSearch";
import { isEmail } from "@/lib/buyerOtp";

test("watch key ignores case/spacing and separates kinds", () => {
  assert.equal(watchKey({ kind: "area", location: "Kokapet,  Hyderabad" }), watchKey({ kind: "area", location: "kokapet, hyderabad" }));
  assert.notEqual(watchKey({ kind: "area", location: "Kokapet, Hyderabad" }), watchKey({ kind: "project", location: "Kokapet, Hyderabad", projectName: "X" }));
  assert.equal(normaliseWatch({ kind: "area", location: "A", projectName: "ignored" }).projectName, null);
});
test("alerts only on a newer figure that moved 3% or more", () => {
  const d1 = new Date("2026-11-01"), d2 = new Date("2026-11-08");
  assert.equal(shouldAlert({ price: 10000, capturedAt: d1 }, { price: 10300, capturedAt: d2, sources: 3, confidence: "High" }), true);
  assert.equal(shouldAlert({ price: 10000, capturedAt: d1 }, { price: 10290, capturedAt: d2, sources: 3, confidence: "High" }), false);
  assert.equal(shouldAlert({ price: 10000, capturedAt: d2 }, { price: 12000, capturedAt: d2, sources: 3, confidence: "High" }), false, "same capture never alerts");
  assert.equal(shouldAlert({ price: null, capturedAt: null }, { price: 12000, capturedAt: d2, sources: 3, confidence: "High" }), false, "first price is a baseline, not an alert");
  assert.equal(changePct(10000, 9650), -3.5);
});
test("saved searches only accept our own search pages", () => {
  assert.equal(validSearchPath("/buy?city=Hyderabad&type=Apartment"), true);
  assert.equal(validSearchPath("/ai-intelligence/hyderabad/kokapet"), true);
  for (const bad of ["https://evil.example/", "//evil.example", "/admin", "/buy<script>", "buy", "/buyer/x"]) assert.equal(validSearchPath(bad), false, bad);
});
test("email check", () => {
  assert.equal(isEmail("a.b@example.com"), true);
  for (const bad of ["a@b", "no-at.example.com", "a b@example.com", ""]) assert.equal(isEmail(bad), false, bad);
});
