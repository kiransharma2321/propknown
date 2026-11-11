// Auto Listing Researcher + Own Engine pieces: pure rules. Run: npm run test:features
import { test } from "node:test";
import assert from "node:assert/strict";
import { redactContacts, supportedBy, isResaleOrSellerPage, conflicts, missingFields, confidenceScore, describe, researchQueries, type Facts } from "@/lib/research/rules";
import { parseRobots, robotsAllows } from "@/lib/search/fetcher";
import { parseJsonLoose } from "@/lib/ai/router";

const f = (value: string, url = "https://a.com/x") => [{ value, sourceUrl: url, capturedAt: "2026-11-11T00:00:00Z" }];

test("contact details are removed before the AI sees a page; RERA / LP numbers are kept", () => {
  const t = redactContacts("Call 98765 43210 or +91-98765-43210, +971 50 123 4567, 040-23456789, sales@abc.com. TS RERA P02400007234, PRM/KA/RERA/1251/309/PR/171016/000602");
  assert.doesNotMatch(t, /98765|4567|23456789|sales@/);
  assert.match(t, /P02400007234/);
  assert.match(t, /PRM\/KA\/RERA\/1251\/309\/PR\/171016\/000602/);
});

test("a fact is kept only if its cited source contains it", () => {
  const src = "Green Meadows by ABC Developers, Kollur. TS RERA No. P02400001234. Price ₹6,800 per sq ft.";
  assert.equal(supportedBy("Green Meadows", src), true);
  assert.equal(supportedBy("P02400001234", src), true);
  assert.equal(supportedBy("P02400009999", src), false, "invented RERA number");
  assert.equal(supportedBy("6,800", src), true);
  assert.equal(supportedBy("7,200", src), false, "invented price");
  assert.equal(supportedBy("Skyline Towers", src), false);
});

test("individual resale / owner / classified pages are never researched", () => {
  for (const u of ["https://www.olx.in/item/flat-123", "https://www.nobroker.in/property/sale/hyderabad/x", "https://www.99acres.com/resale-flats-in-kokapet", "https://www.magicbricks.com/property-for-rent/x", "https://www.facebook.com/groups/x"])
    assert.equal(isResaleOrSellerPage(u), true, u);
  assert.equal(isResaleOrSellerPage("https://www.magicbricks.com/new-projects-Hyderabad"), false);
  assert.equal(isResaleOrSellerPage("https://www.prestigeconstructions.com/residential-projects/hyderabad"), false);
});

test("conflicts, missing fields and confidence", () => {
  const facts: Facts = { name: f("Green Meadows"), location: f("Kollur"), approvalNumber: [...f("P024001"), ...f("P024002", "https://b.com/y")], pricePerUnit: [...f("6800"), ...f("9800", "https://b.com/y")] };
  const c = conflicts(facts);
  assert.equal(c.length, 2);
  assert.ok(missingFields(facts).includes("builder"));
  const clean: Facts = { name: f("A"), builder: f("B", "https://b.com"), location: f("C", "https://c.com"), approvalNumber: f("P0240001"), pricePerUnit: f("6800"), configurations: f("2 BHK"), possession: f("2027"), status: f("under construction"), builderWebsite: f("https://b.com") };
  assert.ok(confidenceScore(clean, { priceVsArea: "within", conflictCount: 0 }) >= 75);
  assert.ok(confidenceScore(facts, { priceVsArea: "outside", conflictCount: c.length }) < 40);
});

test("descriptions are our own words from the facts; no approval -> 'Approval details pending'", () => {
  const d = describe({ name: f("Green Meadows"), builder: f("ABC"), location: f("Kollur") }, "villa", "Hyderabad");
  assert.match(d, /^Green Meadows is a villa project by ABC in Kollur\./);
  assert.match(d, /Approval details pending/);
  assert.equal(researchQueries("Hyderabad", "plot_layout").some((q) => /HMDA/.test(q)), true);
});

test("robots.txt: our agent's group wins, longest rule wins, Allow beats Disallow on a tie", () => {
  const rules = parseRobots("User-agent: *\nDisallow: /private\nAllow: /private/ok\n\nUser-agent: OtherBot\nDisallow: /");
  assert.equal(robotsAllows(rules, "/private/x"), false);
  assert.equal(robotsAllows(rules, "/private/ok/page"), true);
  assert.equal(robotsAllows(rules, "/projects"), true);
  const mine = parseRobots("User-agent: *\nAllow: /\n\nUser-agent: PropKnownBot\nDisallow: /search");
  assert.equal(robotsAllows(mine, "/search?q=1"), false);
  assert.equal(robotsAllows(parseRobots("User-agent: *\nDisallow: /*.pdf$"), "/a/b.pdf"), false);
});

test("AI router: JSON is read even when wrapped in a code fence or text", () => {
  assert.deepEqual(parseJsonLoose('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJsonLoose('Here you go: {"a":[1,2]} thanks'), { a: [1, 2] });
  assert.throws(() => parseJsonLoose("no json here"));
});

test("per-unit price must be one plain number; totals and ranges are total prices", async () => {
  const { perUnitNumber } = await import("@/lib/research/rules");
  assert.equal(perUnitNumber("6,800"), 6800);
  assert.equal(perUnitNumber("₹ 32,000"), 32000);
  for (const v of ["3.58 Cr – 3.64 Cr", "85 L", "1.2 Cr", "6,800 - 7,200", "45 lakh"]) assert.equal(perUnitNumber(v), null, v);
});

test("broker CSV: required columns, valid types, no contact details, quoted cells", async () => {
  const { rowsFromCsv, parseCsv } = await import("@/lib/brokers/csv");
  assert.deepEqual(parseCsv('a,"b, c","say ""hi"""\n1,2,3'), [["a", "b, c", 'say "hi"'], ["1", "2", "3"]]);
  const csv = "title,property_type,locality,city,price,size,size_unit,bhk,approval_type,approval_number,description\n" +
    "Sunrise 3BHK,apartment,Kondapur,Hyderabad,\"1,20,00,000\",1650,sqft,3 BHK,RERA,P02400001111,East facing\n" +
    "Bad type,castle,Kondapur,Hyderabad,,,,,,,\n" +
    "Call me plot,plot,Medchal,Hyderabad,,200,sqyd,,HMDA,LP 12/2025,Call 98765 43210\n";
  const r = rowsFromCsv(csv);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].price, 12000000);
  assert.equal(r.errors.length, 2);
  assert.match(r.errors.join(" "), /property_type/);
  assert.match(r.errors.join(" "), /phone numbers/);
  assert.match(rowsFromCsv("name,city\nx,y").errors[0], /Missing columns/);
});

test("re-check: only changed key facts are reported", async () => {
  const { factChanges } = await import("@/lib/research/recheck");
  const a = { possession: f("Dec 2027"), pricePerUnit: f("6800") };
  assert.deepEqual(factChanges(a, { possession: f("Dec 2027"), pricePerUnit: f("6800") }), []);
  assert.equal(factChanges(a, { possession: f("Jun 2028"), pricePerUnit: f("6800") }).length, 1);
});

test("a portal-only candidate with no builder and no approval number may be a private seller: dropped", async () => {
  const { mayBeIndividualSeller } = await import("@/lib/research/rules");
  const p = "https://www.99acres.com/agricultural-land-in-x-ffid";
  assert.equal(mayBeIndividualSeller({ name: f("Sahaja nature lake", p), location: f("Budhera", p) }), true);
  assert.equal(mayBeIndividualSeller({ name: f("Wonder Vista", p), approvalNumber: f("0817/HMDA/SWDL/2025", p) }), false);
  assert.equal(mayBeIndividualSeller({ name: f("West Woods", "https://kshethragroup.com/x"), location: f("Chevella", "https://kshethragroup.com/x") }), false, "builder's own site");
});
