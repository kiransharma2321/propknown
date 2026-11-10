// M7 maps/nearby -- pure rules. Run: npm run test:features
import { test } from "node:test";
import assert from "node:assert/strict";
import { categorise, summarise, distanceKm, osmEmbedUrl } from "@/lib/geo";

test("categorises OSM tags", () => {
  assert.equal(categorise({ amenity: "school" }), "schools");
  assert.equal(categorise({ railway: "station" }), "transit");
  assert.equal(categorise({ leisure: "park" }), null, "unnamed parks are skipped");
  assert.equal(categorise({ amenity: "bank" }), null);
});
test("distance is sane (Kokapet to Gachibowli ~ 8-12 km)", () => {
  const d = distanceKm({ lat: 17.395, lon: 78.335 }, { lat: 17.44, lon: 78.35 });
  assert.ok(d > 4 && d < 12, String(d));
});
test("summary counts, de-duplicates by name and sorts nearest first", () => {
  const c = { lat: 17.4, lon: 78.33 };
  const s = summarise(c, [
    { lat: 17.41, lon: 78.33, tags: { amenity: "school", name: "Far School" } },
    { lat: 17.401, lon: 78.33, tags: { amenity: "school", name: "Near School" } },
    { center: { lat: 17.401, lon: 78.33 }, tags: { amenity: "school", name: "Near School" } },
    { lat: 17.402, lon: 78.33, tags: { amenity: "school" } },
  ]);
  assert.equal(s.schools.total, 3);
  assert.deepEqual(s.schools.nearest.map((p) => p.name), ["Near School", "Far School"]);
});
test("embed URL carries a marker", () => assert.match(osmEmbedUrl({ lat: 17.4, lon: 78.33 }), /marker=17\.40000,78\.33000/));
