// M3 compare -- pure rules. Run: npm run test:features
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseItem, itemKey } from "@/lib/compare";

test("parses area / project / listing items and rejects junk", () => {
  assert.deepEqual(parseItem("area|Kokapet, Hyderabad|apartment"), { kind: "area", location: "Kokapet, Hyderabad", propertyType: "apartment" });
  assert.deepEqual(parseItem("project|Kowsalya Manidweepam|Bachupally"), { kind: "project", name: "Kowsalya Manidweepam", location: "Bachupally", propertyType: "apartment" });
  assert.deepEqual(parseItem("listing|cmwa8kbu1000al4u27136ty3z"), { kind: "listing", id: "cmwa8kbu1000al4u27136ty3z" });
  for (const bad of ["", "area|", "project|OnlyName", "listing|../../etc", "bogus|x"]) assert.equal(parseItem(bad), null, bad);
});
test("item keys round-trip through the parser", () => {
  for (const raw of ["area|Kokapet, Hyderabad|apartment", "project|X Towers|Kondapur, Hyderabad|villa"]) assert.equal(itemKey(parseItem(raw)!), raw);
});
