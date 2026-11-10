// M11 BI -- pure rules. Run: npm run test:features
import { test } from "node:test";
import assert from "node:assert/strict";
import { normaliseSource, toCsv } from "@/lib/insights";

test("lead source spellings are grouped", () => {
  assert.equal(normaliseSource("ai_intelligence"), normaliseSource("ai-intelligence"));
  assert.equal(normaliseSource("buy-page"), "buy");
  assert.equal(normaliseSource("Price Check — Kokapet, Hyderabad"), "price-check");
});
test("CSV quotes cells and neutralises spreadsheet formulas", () => {
  const csv = toCsv([{ name: 'A "quoted" name', note: "=HYPERLINK(\"http://evil\")", phone: "+919000000000", d: new Date("2026-11-10T00:00:00Z") }]);
  const [head, row] = csv.split("\r\n");
  assert.equal(head, "name,note,phone,d");
  assert.match(row, /^"A ""quoted"" name","'=HYPERLINK/);
  assert.match(row, /,"\+919000000000",/, "phone numbers are left as they are");
  assert.match(toCsv([{ x: "+SUM(A1)" }, { x: "-cmd" }]), /"'\+SUM\(A1\)"\r\n"'-cmd"/);
  assert.match(row, /"2026-11-10T00:00:00.000Z"$/);
});
