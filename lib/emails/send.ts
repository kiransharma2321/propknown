import crypto from "crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

// Tracked sending for the automation emails (Task 2+). Every attempt -- sent, failed or
// skipped -- is written to email_log, which is what the admin "Sequences" view reads.
// Marketing emails are refused for suppressed/opted-out addresses and always carry a
// one-click unsubscribe (link in the footer + RFC 8058 List-Unsubscribe headers).

const FROM = "PropKnown <notifications@propknown.com>";
export const ADMIN_ALERT_EMAIL = "raghupinnelli@gmail.com";

export type EmailKind =
  | "report" | "day2" | "day5" | "hot_alert" | "newsletter" | "listing_verify"
  | "listing_approved" | "listing_rejected" | "callback_alert" | "lead_alert" | "test";

const MARKETING: EmailKind[] = ["day2", "day5", "newsletter"];

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("UNSUBSCRIBE_SECRET (or NEXTAUTH_SECRET) must be set to sign unsubscribe links");
  return s;
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function unsubscribeToken(email: string): string {
  return crypto.createHmac("sha256", secret()).update(normaliseEmail(email)).digest("base64url").slice(0, 32);
}

export function verifyUnsubscribe(email: string, token: string): boolean {
  const expected = unsubscribeToken(email);
  return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

// Signs an arbitrary value (e.g. a lead id in a report download link) with the same secret.
export function signValue(value: string): string {
  return crypto.createHmac("sha256", secret()).update(`v1:${value}`).digest("base64url").slice(0, 32);
}

export function verifySigned(value: string, token: string): boolean {
  const expected = signValue(value);
  return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function unsubscribeUrl(email: string): string {
  const e = Buffer.from(normaliseEmail(email)).toString("base64url");
  return `${SITE_URL}/api/unsubscribe?e=${e}&t=${unsubscribeToken(email)}`;
}

export async function isSuppressed(email: string): Promise<boolean> {
  const e = normaliseEmail(email);
  const [sup, optedOut] = await Promise.all([
    prisma.emailSuppression.findUnique({ where: { email: e } }),
    prisma.lead.findFirst({ where: { email: { equals: e, mode: "insensitive" }, marketingOptOut: true }, select: { id: true } }),
  ]);
  return Boolean(sup || optedOut);
}

export interface TrackedSend {
  to: string;
  subject: string;
  html: string;
  kind: EmailKind;
  leadId?: string | null;
  attachments?: { filename: string; content: Buffer }[];
}

export async function sendTracked(opts: TrackedSend): Promise<{ ok: boolean; status: "sent" | "failed" | "skipped"; id?: string; error?: string }> {
  const to = normaliseEmail(opts.to);
  const log = (status: "sent" | "failed" | "skipped", extra: { providerId?: string; error?: string } = {}) =>
    prisma.emailLog.create({ data: { leadId: opts.leadId ?? null, to, kind: opts.kind, subject: opts.subject, status, ...extra } })
      .catch((e) => console.error("[email] email_log write failed:", e));

  if (MARKETING.includes(opts.kind) && await isSuppressed(to)) {
    await log("skipped", { error: "unsubscribed" });
    return { ok: false, status: "skipped", error: "unsubscribed" };
  }

  const key = process.env.RESEND_API_KEY;
  if (!key || key.length < 10) {
    await log("failed", { error: "RESEND_API_KEY missing" });
    return { ok: false, status: "failed", error: "RESEND_API_KEY missing" };
  }

  const unsub = unsubscribeUrl(to);
  try {
    const r = await new Resend(key).emails.send({
      from: FROM,
      to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.attachments?.length ? { attachments: opts.attachments } : {}),
      headers: {
        "List-Unsubscribe": `<${unsub}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (r.error) {
      const msg = typeof r.error === "object" && "message" in r.error ? String(r.error.message) : String(r.error);
      await log("failed", { error: msg.slice(0, 300) });
      return { ok: false, status: "failed", error: msg };
    }
    await log("sent", { providerId: r.data?.id });
    return { ok: true, status: "sent", id: r.data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await log("failed", { error: msg.slice(0, 300) });
    return { ok: false, status: "failed", error: msg };
  }
}
