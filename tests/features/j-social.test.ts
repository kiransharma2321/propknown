// Task J Social Media Hub -- pure rules. Run: npm run test:features
import { test } from "node:test";
import assert from "node:assert/strict";
import { trackedUrl, shareUrl, captionFor, type HubItem } from "@/lib/socialHub";

const item: HubItem = { kind: "post", id: "1", title: "Kokapet prices this month", path: "/news/kokapet-prices", publishedAt: null, captions: { linkedin: "A".repeat(400), instagram: "Insta caption" } };

test("tracked links carry UTM tags for Business Insights", () => {
  const u = new URL(trackedUrl("/news/kokapet-prices", "linkedin", "kokapet-prices"));
  assert.equal(u.searchParams.get("utm_source"), "linkedin");
  assert.equal(u.searchParams.get("utm_medium"), "social");
  assert.equal(u.searchParams.get("utm_campaign"), "kokapet-prices");
});
test("share URLs use the platforms' public share pages; Instagram has none", () => {
  assert.match(shareUrl("linkedin", "t", "https://x.example/a")!, /^https:\/\/www\.linkedin\.com\/sharing\/share-offsite\//);
  assert.match(shareUrl("whatsapp", "hello", "https://x.example/a")!, /^https:\/\/wa\.me\/\?text=hello/);
  assert.equal(shareUrl("instagram", "t", "l"), null);
});
test("X caption fits the limit; missing captions fall back to the title", () => {
  assert.ok(captionFor(item, "x").length <= 250);
  assert.equal(captionFor({ ...item, captions: {} }, "instagram"), "Kokapet prices this month");
});
