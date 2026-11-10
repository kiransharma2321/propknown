// Admin/CRM session cookie: signed, expiring, tamper-proof. Pure (no database, no network).
// Run: npm run test:security
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSessionToken, readSessionToken, verifySessionToken, SESSION_TTL_MS } from "@/lib/adminSession";

process.env.NEXTAUTH_SECRET ||= "test-secret-test-secret-test-secret-1234";
const user = { id: "user_abc123", passwordHash: "$2a$12$examplehashexamplehashexamplehash" };
const ok = (t: string | null, u = user, now?: number) => !!t && !!readSessionToken(t, now) && verifySessionToken(t, u);

test("valid token verifies", () => assert.equal(ok(createSessionToken(user)), true));
test("old unsigned format is rejected", () => assert.equal(ok(`${user.id}:${Date.now()}`), false));
test("tampered user id is rejected", () => {
  const t = createSessionToken(user)!.split(".");
  t[1] = "someone_else";
  assert.equal(ok(t.join("."), { ...user, id: "someone_else" }), false);
});
test("tampered expiry is rejected", () => {
  const t = createSessionToken(user)!.split(".");
  t[3] = String(Number(t[3]) + 1000);
  assert.equal(ok(t.join(".")), false);
});
test("tampered signature is rejected", () => {
  const t = createSessionToken(user)!;
  assert.equal(ok(t.slice(0, -2) + (t.endsWith("AA") ? "BB" : "AA")), false);
});
test("expired token is rejected", () => {
  const t = createSessionToken(user, Date.now() - SESSION_TTL_MS - 1000);
  assert.equal(ok(t), false);
});
test("password change logs the session out", () => {
  const t = createSessionToken(user);
  assert.equal(ok(t, { ...user, passwordHash: "$2a$12$differenthash" }), false);
});
test("no secret -> no sessions (fails closed)", () => {
  const saved = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = "";
  try { assert.equal(createSessionToken(user), null); }
  finally { process.env.NEXTAUTH_SECRET = saved; }
});
