// M12 WhatsApp -- pure rules + webhook signature. Run: npm run test:features
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";
import { normalisePhone, classify, canMessage, inWindow, aiMayReply, followupDue, validTemplateName, placeholderCount } from "@/lib/whatsapp/rules";
import { verifySignature } from "@/lib/whatsapp/cloud";

const base = { consentAt: new Date("2026-11-01"), optedOutAt: null, lastInboundAt: null, humanTakeoverAt: null, aiEnabled: true, followupStep: 1, followupStartedAt: new Date("2026-11-01") };
const now = Date.parse("2026-11-04T00:00:00Z");

test("phone numbers are normalised to country-code digits", () => {
  assert.equal(normalisePhone("98765 43210"), "919876543210");
  assert.equal(normalisePhone("+91 98765-43210"), "919876543210");
  assert.equal(normalisePhone("0044 7700 900123"), "447700900123");
  assert.equal(normalisePhone("12345"), null);
});
test("intents: STOP in several languages, human hand-off, hot leads", () => {
  for (const s of ["STOP", "stop.", "Unsubscribe", "opt out", "vaddu", "band karo"]) assert.equal(classify(s), "stop", s);
  assert.equal(classify("START"), "start");
  assert.equal(classify("Can I talk to a human?"), "human");
  assert.equal(classify("I want a site visit this Sunday"), "hot");
  assert.equal(classify("my budget is 90 lakh"), "hot");
  assert.equal(classify("what is the price in Kokapet?"), "question");
  assert.equal(classify("please don't stop sending"), "question", "STOP only as the whole message");
});
test("consent and opt-out decide who may get templates", () => {
  assert.equal(canMessage(base), true);
  assert.equal(canMessage({ ...base, consentAt: null }), false);
  assert.equal(canMessage({ ...base, optedOutAt: new Date("2026-11-02") }), false);
  assert.equal(canMessage({ ...base, optedOutAt: new Date("2026-10-01") }), true, "re-consented after an old opt-out");
});
test("24-hour window and AI replies", () => {
  const inside = { ...base, lastInboundAt: new Date(now - 3_600_000) };
  assert.equal(inWindow(inside, now), true);
  assert.equal(inWindow({ ...base, lastInboundAt: new Date(now - 25 * 3_600_000) }, now), false);
  assert.equal(aiMayReply(inside, now), true);
  assert.equal(aiMayReply({ ...inside, humanTakeoverAt: new Date() }, now), false, "human took over");
  assert.equal(aiMayReply({ ...inside, aiEnabled: false }, now), false);
});
test("follow-ups: day 2 then day 5, stop when they reply or opt out", () => {
  assert.equal(followupDue(base, now), "day2");
  assert.equal(followupDue({ ...base, followupStep: 2 }, now), null, "day 5 not yet");
  assert.equal(followupDue({ ...base, followupStep: 2 }, Date.parse("2026-11-07")), "day5");
  assert.equal(followupDue({ ...base, lastInboundAt: new Date("2026-11-02") }, now), null, "replied");
  assert.equal(followupDue({ ...base, optedOutAt: new Date("2026-11-02") }, now), null, "opted out");
});
test("template names and placeholders", () => {
  assert.equal(validTemplateName("lead_welcome_v1"), true);
  assert.equal(validTemplateName("Lead Welcome"), false);
  assert.equal(placeholderCount("Hi {{1}}, your {{2}} report. {{1}}"), 2);
});
test("webhook signature: only Meta's HMAC with the app secret passes", () => {
  const body = JSON.stringify({ object: "whatsapp_business_account" });
  const sig = "sha256=" + createHmac("sha256", "test-secret").update(body).digest("hex");
  assert.equal(verifySignature(body, sig, "test-secret"), true);
  assert.equal(verifySignature(body + " ", sig, "test-secret"), false, "tampered body");
  assert.equal(verifySignature(body, sig, "other-secret"), false);
  assert.equal(verifySignature(body, null, "test-secret"), false);
  assert.equal(verifySignature(body, sig, ""), false, "no secret configured -> reject");
});
