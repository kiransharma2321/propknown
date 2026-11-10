// M4 Investment Score + ROI calculator -- pure rules. Run: npm run test:features
import { test } from "node:test";
import assert from "node:assert/strict";
import { investmentScore, cagr, roi, FACTORS } from "@/lib/investmentScore";

test("weights add up to 100", () => assert.equal(Object.values(FACTORS).reduce((a, f) => a + f.weight, 0), 100));
test("no score with fewer than 3 real factors", () => {
  const r = investmentScore({ confidence: "High", rentalYieldPct: 4 });
  assert.equal(r.score, null);
  assert.match(r.basedOn, /2 of 5/);
});
test("missing factors are left out and weights re-scaled", () => {
  const r = investmentScore({ confidence: "High", rentalYieldPct: 5, history5yr: [{ year: 2021, value: 100 }, { year: 2026, value: 161.05 }] });
  assert.equal(r.used.length, 3);
  assert.equal(r.score, 100); // all three max out
  assert.equal(r.missing.length, 2);
});
test("value factor rewards below-area prices and penalises 30%+ premiums", () => {
  const cheap = investmentScore({ price: 8000, areaPrice: 10000, areaRangeMin: 8500, confidence: "Medium", rera: "none" });
  const dear = investmentScore({ price: 13500, areaPrice: 10000, areaRangeMin: 8500, confidence: "Medium", rera: "none" });
  assert.equal(cheap.used.find((u) => u.key === "value")!.points, 100);
  assert.equal(dear.used.find((u) => u.key === "value")!.points, 0);
});
test("CAGR and ROI maths", () => {
  assert.equal(Math.round(cagr([{ year: 2021, value: 100 }, { year: 2026, value: 161.05 }])! * 10) / 10, 10);
  const r = roi({ buyPrice: 10_000_000, buyCosts: 700_000, sellPrice: 14_000_000, sellCosts: 200_000, years: 5, monthlyRent: 30_000, yearlyOwnerCosts: 60_000 });
  assert.equal(r.invested, 10_700_000);
  assert.equal(r.gain, 13_800_000 - 10_700_000 + 1_800_000 - 300_000);
  assert.equal(r.grossYield, 3.6);
});
