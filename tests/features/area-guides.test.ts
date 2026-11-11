// /area-prices -- place parsing rules. Run: npm run test:features
import { test } from "node:test";
import assert from "node:assert/strict";
import { placeFromName } from "@/lib/areaGuides";

test("area, city and country are read from cached location names", () => {
  assert.deepEqual(placeFromName("Kokapet, Hyderabad, India"), { area: "Kokapet", city: "Hyderabad", country: "India" });
  assert.deepEqual(placeFromName("Whitefield, Bangalore"), { area: "Whitefield", city: "Bengaluru", country: "India", rawCity: "Bangalore" });
  assert.deepEqual(placeFromName("Business Bay, Dubai"), { area: "Business Bay", city: "Dubai", country: "UAE" });
  assert.deepEqual(placeFromName("Canary Wharf, London"), { area: "Canary Wharf", city: "London", country: "United Kingdom" });
  assert.deepEqual(placeFromName("Jurong East, Singapore"), { area: "Jurong East", city: "Singapore", country: "Singapore" });
});
test("city-level rows are not listed as areas", () => {
  assert.equal(placeFromName("Hyderabad, India"), null);
  assert.equal(placeFromName("Hyderabad"), null);
  assert.equal(placeFromName("Dubai, Dubai"), null);
});
