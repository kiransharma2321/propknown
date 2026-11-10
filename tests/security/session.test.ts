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

// Customer accounts (lib/buyerAuth.ts) use the same signer with their own key.
test("admin and customer tokens are not interchangeable", async () => {
  const { makeSession } = await import("@/lib/signedSession");
  const admin = makeSession("admin", SESSION_TTL_MS), buyer = makeSession("buyer", SESSION_TTL_MS);
  const a = admin.create(user)!, b = buyer.create(user)!;
  assert.equal(buyer.verify(a, user), false);
  assert.equal(admin.verify(b, user), false);
  assert.equal(buyer.verify(b, user), true);
});
test("customer passwords: legacy hash accepted once and flagged for bcrypt upgrade", async () => {
  const { createHash } = await import("crypto");
  const { verifyBuyerPassword, hashPassword } = await import("@/lib/buyerAuth");
  const legacy = createHash("sha256").update("s3cret-pass" + process.env.NEXTAUTH_SECRET).digest("hex");
  assert.deepEqual(await verifyBuyerPassword("s3cret-pass", legacy), { ok: true, upgrade: true });
  assert.deepEqual(await verifyBuyerPassword("wrong", legacy), { ok: false, upgrade: false });
  const modern = await hashPassword("s3cret-pass");
  assert.match(modern, /^\$2[aby]\$12\$/);
  assert.deepEqual(await verifyBuyerPassword("s3cret-pass", modern), { ok: true, upgrade: false });
  assert.deepEqual(await verifyBuyerPassword("wrong", modern), { ok: false, upgrade: false });
});
