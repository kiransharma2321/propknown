import { Resend } from "resend";
import { toIndianWaNumber } from "@/lib/phone";

// Canonical notification recipient — all admin alerts (lead alerts, enquiry notifications,
// submission approvals) go here. kiranpinnelli@propknown.com and kiranpropservices@gmail.com
// were removed 2026-07-08: both hard-bounce and get re-suppressed by Resend on every send
// attempt (propknown.com has no DMARC record and no sending history yet), while this address
// has confirmed, repeated actual delivery. Re-add the other two once their bounce is resolved.
const ADMIN_EMAILS = ["raghupinnelli@gmail.com"];

// propknown.com is verified in Resend (sending enabled) as of 2026-07-07 -- confirmed this is
// the correct FROM domain via the Resend API itself (domains.get returns "name": "propknown.com",
// "status": "verified"; send.propknown.com is NOT independently verified -- Resend rejects it
// outright as a sender, it's only where Resend's own SPF/bounce-handling DNS records happen to
// live, used internally via the envelope-from, not the visible From: address). DKIM signs as
// d=propknown.com, which is what DMARC alignment actually checks against the From: header.
const FROM_ADDRESS = "PropKnown <notifications@propknown.com>";

// User-supplied strings (lead names, messages, buyer names, etc.) are interpolated into these
// HTML email templates — escape them so a crafted value can't break the layout or spoof content.
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "ADD-YOUR-RESEND-KEY-HERE" || key.length < 10) {
    console.warn("[email] RESEND_API_KEY is missing or invalid — emails disabled");
    return null;
  }
  return new Resend(key);
}

interface SendOptions {
  to?: string | string[];
  subject: string;
  html: string;
  from?: string;
}

// Sends to each recipient as its own independent Resend API call. Deliberately NOT a single
// multi-recipient call: Resend's sandbox mode (no verified domain) rejects the ENTIRE send if
// ANY recipient isn't the account owner's own verified address -- a single failing recipient
// would silently take down delivery to every other recipient too. Sending independently means
// one address failing (e.g. not yet verified) never blocks the others from receiving it.
export async function sendAdminEmail(opts: SendOptions): Promise<void> {
  const client = getResend();
  if (!client) {
    console.warn(`[email] Skipped "${opts.subject}" — Resend client unavailable (no/invalid API key)`);
    return;
  }

  const recipients = opts.to
    ? (Array.isArray(opts.to) ? opts.to : [opts.to])
    : ADMIN_EMAILS;

  console.log(`[email] Sending "${opts.subject}" to ${recipients.length} recipient(s): ${recipients.join(", ")}`);

  await Promise.all(recipients.map(async (to) => {
    try {
      const result = await client.emails.send({
        from: opts.from ?? FROM_ADDRESS,
        to,
        subject: opts.subject,
        html: opts.html,
      });
      if (result.error) {
        console.error(`[email] FAILED → ${to} — "${opts.subject}":`, result.error);
      } else {
        console.log(`[email] SENT OK → ${to} — id: ${result.data?.id} — "${opts.subject}"`);
      }
    } catch (err) {
      console.error(`[email] THREW → ${to} — "${opts.subject}":`, err);
    }
  }));
}

// Admin's own WhatsApp number (matches the site-wide contact number, +91 70130 16003) --
// generates a wa.me link pre-addressed to Raghu himself with the lead's details already
// filled in, so opening it (from the admin panel or this email) drops a ready-to-send
// summary into his own WhatsApp for logging/forwarding to whoever's handling follow-up.
// Deliberately separate from the lead's own WhatsApp link below (which messages the LEAD).
export function buildRaghuNotifyWhatsAppLink(lead: {
  name: string; phone: string; email?: string; message?: string; source: string;
}): string {
  const lines = [
    `New PropKnown lead:`,
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    lead.email ? `Email: ${lead.email}` : null,
    `Source: ${lead.source}`,
    lead.message ? `Enquiry: ${lead.message}` : null,
  ].filter(Boolean);
  return `https://wa.me/917013016003?text=${encodeURIComponent(lines.join("\n"))}`;
}

export function buildLeadHtml(lead: {
  name: string; phone: string; email?: string;
  message?: string; source: string;
}): string {
  const safe = {
    name: escapeHtml(lead.name), phone: escapeHtml(lead.phone),
    email: lead.email ? escapeHtml(lead.email) : undefined,
    message: lead.message ? escapeHtml(lead.message) : undefined,
    source: escapeHtml(lead.source),
  };
  const waLink = `https://wa.me/${toIndianWaNumber(lead.phone)}?text=${encodeURIComponent(`Hi ${lead.name}, this is Raghu from PropKnown. How can I help you?`)}`;
  const notifyWaLink = buildRaghuNotifyWhatsAppLink(lead);
  return `
    <div style="font-family:sans-serif;max-width:560px;background:#fff;border-radius:12px;border:1px solid #e5e5e5;overflow:hidden">
      <div style="background:#0a0a0a;padding:20px 24px">
        <span style="color:#C9A24B;font-size:20px;font-weight:800">PROP</span>
        <span style="color:#fff;font-size:20px;font-weight:800">KNOWN</span>
        <p style="color:#999;font-size:11px;margin:4px 0 0">New Lead Alert</p>
      </div>
      <div style="padding:24px">
        <h2 style="margin:0 0 16px;color:#0a0a0a;font-size:16px">New lead from <span style="color:#C9A24B">${safe.source}</span></h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr style="background:#f8f8f8"><td style="padding:8px 12px;font-weight:600;color:#555;width:100px;border:1px solid #e5e5e5">Name</td><td style="padding:8px 12px;border:1px solid #e5e5e5;font-weight:600">${safe.name}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Phone</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${safe.phone}</td></tr>
          <tr style="background:#f8f8f8"><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Email</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${safe.email ?? "—"}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Source</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${safe.source}</td></tr>
          <tr style="background:#f8f8f8"><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Message</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${safe.message ?? "—"}</td></tr>
        </table>
        <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap">
          <a href="${waLink}" style="display:inline-block;background:#25d366;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">WhatsApp ${safe.name}</a>
          <a href="${notifyWaLink}" style="display:inline-block;background:#128C7E;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Notify Raghu (WhatsApp)</a>
          <a href="https://www.propknown.com/admin/dashboard?tab=leads" style="display:inline-block;background:#C9A24B;color:#000;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Open CRM →</a>
        </div>
        <p style="color:#aaa;font-size:10px;margin-top:20px;border-top:1px solid #e5e5e5;padding-top:12px">PropKnown Infra Pvt Ltd · kiranpropservices@gmail.com · +91 70130 16003</p>
      </div>
    </div>`;
}

export function buildSubmissionHtml(s: {
  title: string; propType: string; bhk?: string; priceDisplay: string;
  city: string; area: string; ownerName: string; ownerPhone: string;
  ownerEmail: string; reraNumber?: string; photoCount: number; docCount: number;
}): string {
  const t = escapeHtml(s.title), pt = escapeHtml(s.propType), bhk = s.bhk ? escapeHtml(s.bhk) : undefined;
  const area = escapeHtml(s.area), city = escapeHtml(s.city), price = escapeHtml(s.priceDisplay);
  const owner = escapeHtml(s.ownerName), phone = escapeHtml(s.ownerPhone), email = escapeHtml(s.ownerEmail);
  const rera = s.reraNumber ? escapeHtml(s.reraNumber) : undefined;
  return `
    <div style="font-family:sans-serif;max-width:600px;background:#fff;border-radius:12px;border:1px solid #e5e5e5;overflow:hidden">
      <div style="background:#0a0a0a;padding:20px 24px">
        <span style="color:#C9A24B;font-size:20px;font-weight:800">PROP</span>
        <span style="color:#fff;font-size:20px;font-weight:800">KNOWN</span>
        <p style="color:#999;font-size:11px;margin:4px 0 0">New Property Submission — Review Required</p>
      </div>
      <div style="padding:24px">
        <h2 style="margin:0 0 16px;color:#0a0a0a;font-size:16px">New submission: <span style="color:#C9A24B">${t}</span></h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr style="background:#f8f8f8"><td style="padding:8px 12px;font-weight:600;color:#555;width:110px;border:1px solid #e5e5e5">Title</td><td style="padding:8px 12px;border:1px solid #e5e5e5;font-weight:600">${t}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Type</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${pt}${bhk ? " — " + bhk : ""}</td></tr>
          <tr style="background:#f8f8f8"><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Location</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${area}, ${city}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Price</td><td style="padding:8px 12px;border:1px solid #e5e5e5;font-weight:700;color:#C9A24B">${price}</td></tr>
          <tr style="background:#f8f8f8"><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Owner</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${owner}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Phone</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${phone}</td></tr>
          <tr style="background:#f8f8f8"><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Email</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${email}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">RERA</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${rera ?? "Not provided"}</td></tr>
          <tr style="background:#f8f8f8"><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Files</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${s.photoCount} photo(s), ${s.docCount} doc(s)</td></tr>
        </table>
        <div style="margin-top:20px">
          <a href="https://www.propknown.com/admin/dashboard?tab=submissions" style="display:inline-block;background:#C9A24B;color:#000;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Review in Admin Dashboard →</a>
        </div>
        <p style="color:#aaa;font-size:10px;margin-top:20px;border-top:1px solid #e5e5e5;padding-top:12px">PropKnown Infra Pvt Ltd · kiranpropservices@gmail.com · +91 70130 16003</p>
      </div>
    </div>`;
}

export function buildApprovalHtml(opts: {
  action: "approved" | "rejected"; ownerName: string; title: string; reason?: string;
}): string {
  const isApproved = opts.action === "approved";
  const owner = escapeHtml(opts.ownerName), title = escapeHtml(opts.title), reason = opts.reason ? escapeHtml(opts.reason) : undefined;
  return `
    <div style="font-family:sans-serif;max-width:540px;background:#fff;border-radius:12px;border:1px solid #e5e5e5;overflow:hidden">
      <div style="background:#0a0a0a;padding:20px 24px">
        <span style="color:#C9A24B;font-size:20px;font-weight:800">PROP</span>
        <span style="color:#fff;font-size:20px;font-weight:800">KNOWN</span>
      </div>
      <div style="padding:24px">
        <h2 style="color:${isApproved ? "#16a34a" : "#dc2626"};margin:0 0 12px">Your listing has been ${opts.action}</h2>
        <p style="color:#333;font-size:14px">Dear ${owner},</p>
        <p style="color:#333;font-size:14px">Your property listing "<strong>${title}</strong>" has been <strong>${opts.action}</strong> by our team.</p>
        ${!isApproved && reason ? `<p style="color:#dc2626;font-size:13px;background:#fef2f2;padding:10px 14px;border-radius:8px;border:1px solid #fecaca">Reason: ${reason}</p>` : ""}
        ${isApproved ? `<p style="color:#333;font-size:13px">Your property is now live on PropKnown and visible to buyers. We will contact you shortly with next steps.</p>` : `<p style="color:#333;font-size:13px">Please make the requested changes and resubmit, or contact us for clarification.</p>`}
        <p style="margin-top:20px;color:#555;font-size:13px">Questions? Call or WhatsApp our team: <a href="tel:+917013016003" style="color:#C9A24B;font-weight:700">+91 70130 16003</a></p>
        <p style="color:#aaa;font-size:10px;margin-top:20px;border-top:1px solid #e5e5e5;padding-top:12px">PropKnown Infra Pvt Ltd · kiranpropservices@gmail.com · +91 70130 16003 · Hyderabad</p>
      </div>
    </div>`;
}

// ─── Admin/CRM account recovery (/admin + /crm, all roles) ──────────────────────
// Separate from sendAdminEmail: that function is fire-and-forget (logs internally, returns
// void) for notification-style mail where nothing downstream needs to know if it worked. These
// two are the actual delivery mechanism for account recovery -- the caller needs the real
// success/failure and Resend message id back, both to log clearly server-side and so this was
// independently verifiable during setup.
interface SendResult { ok: boolean; id?: string; error?: unknown; }

function buildResetPasswordHtml(name: string, resetLink: string): string {
  const safeName = escapeHtml(name);
  return `
    <div style="font-family:sans-serif;max-width:520px;background:#fff;border-radius:12px;border:1px solid #e5e5e5;overflow:hidden">
      <div style="background:#0a0a0a;padding:20px 24px">
        <span style="color:#C9A24B;font-size:20px;font-weight:800">PROP</span>
        <span style="color:#fff;font-size:20px;font-weight:800">KNOWN</span>
        <p style="color:#999;font-size:11px;margin:4px 0 0">Admin / CRM Password Reset</p>
      </div>
      <div style="padding:24px">
        <p style="color:#333;font-size:14px">Hi ${safeName},</p>
        <p style="color:#333;font-size:14px">We received a request to reset your PropKnown admin/CRM password. Click below to set a new one:</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${resetLink}" style="display:inline-block;background:#C9A24B;color:#000;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Set New Password</a>
        </div>
        <p style="color:#777;font-size:12px">Or paste this link into your browser:</p>
        <p style="color:#0a66c2;font-size:12px;word-break:break-all">${resetLink}</p>
        <p style="color:#dc2626;font-size:12px;background:#fef2f2;padding:10px 14px;border-radius:8px;border:1px solid #fecaca;margin-top:16px">This link expires in 45 minutes and can only be used once.</p>
        <p style="color:#777;font-size:12px;margin-top:16px">If you didn't request this, you can safely ignore this email — your password won't change.</p>
        <p style="color:#aaa;font-size:10px;margin-top:20px;border-top:1px solid #e5e5e5;padding-top:12px">PropKnown Infra Pvt Ltd · kiranpropservices@gmail.com · +91 70130 16003 · Hyderabad</p>
      </div>
    </div>`;
}

function buildUsernameRecoveryHtml(name: string, email: string): string {
  const safeName = escapeHtml(name);
  return `
    <div style="font-family:sans-serif;max-width:520px;background:#fff;border-radius:12px;border:1px solid #e5e5e5;overflow:hidden">
      <div style="background:#0a0a0a;padding:20px 24px">
        <span style="color:#C9A24B;font-size:20px;font-weight:800">PROP</span>
        <span style="color:#fff;font-size:20px;font-weight:800">KNOWN</span>
        <p style="color:#999;font-size:11px;margin:4px 0 0">Admin / CRM Username Recovery</p>
      </div>
      <div style="padding:24px">
        <p style="color:#333;font-size:14px">Hi ${safeName},</p>
        <p style="color:#333;font-size:14px">You (or someone using this email address) asked to recover your PropKnown admin/CRM login. Your username is your email address:</p>
        <div style="text-align:center;margin:24px 0">
          <span style="display:inline-block;background:#f8f8f8;border:1px solid #e5e5e5;border-radius:8px;padding:12px 24px;font-weight:700;font-size:15px;color:#0a0a0a">${escapeHtml(email)}</span>
        </div>
        <p style="color:#333;font-size:13px">Use it to log in at <a href="https://www.propknown.com/admin" style="color:#C9A24B">propknown.com/admin</a> or <a href="https://www.propknown.com/crm" style="color:#C9A24B">propknown.com/crm</a>.</p>
        <p style="color:#777;font-size:12px;margin-top:16px">If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#aaa;font-size:10px;margin-top:20px;border-top:1px solid #e5e5e5;padding-top:12px">PropKnown Infra Pvt Ltd · kiranpropservices@gmail.com · +91 70130 16003 · Hyderabad</p>
      </div>
    </div>`;
}

export async function sendPasswordResetEmail(to: string, name: string, resetLink: string): Promise<SendResult> {
  const client = getResend();
  if (!client) {
    console.warn(`[email] Skipped password reset to ${to} — Resend client unavailable (no/invalid API key)`);
    return { ok: false, error: "no_resend_client" };
  }
  try {
    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: "Reset your PropKnown admin/CRM password",
      html: buildResetPasswordHtml(name, resetLink),
    });
    if (result.error) {
      console.error(`[email] Password reset FAILED → ${to}:`, result.error);
      return { ok: false, error: result.error };
    }
    console.log(`[email] Password reset SENT OK → ${to} — id: ${result.data?.id}`);
    return { ok: true, id: result.data?.id };
  } catch (err) {
    console.error(`[email] Password reset THREW → ${to}:`, err);
    return { ok: false, error: err };
  }
}

export async function sendUsernameRecoveryEmail(to: string, name: string): Promise<SendResult> {
  const client = getResend();
  if (!client) {
    console.warn(`[email] Skipped username recovery to ${to} — Resend client unavailable (no/invalid API key)`);
    return { ok: false, error: "no_resend_client" };
  }
  try {
    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: "Your PropKnown admin/CRM username",
      html: buildUsernameRecoveryHtml(name, to),
    });
    if (result.error) {
      console.error(`[email] Username recovery FAILED → ${to}:`, result.error);
      return { ok: false, error: result.error };
    }
    console.log(`[email] Username recovery SENT OK → ${to} — id: ${result.data?.id}`);
    return { ok: true, id: result.data?.id };
  } catch (err) {
    console.error(`[email] Username recovery THREW → ${to}:`, err);
    return { ok: false, error: err };
  }
}
