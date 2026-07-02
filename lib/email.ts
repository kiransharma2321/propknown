import { Resend } from "resend";

// Canonical notification recipients — all admin alerts go to both
const ADMIN_EMAILS = ["kiranpropservices@gmail.com", "raghupinnelli@gmail.com"];

const FROM_ADDRESS = "PropKnown <onboarding@resend.dev>";

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

export async function sendAdminEmail(opts: SendOptions): Promise<void> {
  const client = getResend();
  if (!client) return;
  try {
    const result = await client.emails.send({
      from: opts.from ?? FROM_ADDRESS,
      to:   opts.to ?? ADMIN_EMAILS,
      subject: opts.subject,
      html: opts.html,
    });
    if (result.error) {
      console.error("[email] Resend error:", result.error);
    } else {
      console.log(`[email] Sent OK — id: ${result.data?.id} subject: "${opts.subject}"`);
    }
  } catch (err) {
    console.error("[email] Failed to send:", opts.subject, err);
  }
}

export function buildLeadHtml(lead: {
  name: string; phone: string; email?: string;
  message?: string; source: string;
}): string {
  const waLink = `https://wa.me/91${lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${lead.name}, this is Raghu from PropKnown. How can I help you?`)}`;
  return `
    <div style="font-family:sans-serif;max-width:560px;background:#fff;border-radius:12px;border:1px solid #e5e5e5;overflow:hidden">
      <div style="background:#0a0a0a;padding:20px 24px">
        <span style="color:#C9A24B;font-size:20px;font-weight:800">PROP</span>
        <span style="color:#fff;font-size:20px;font-weight:800">KNOWN</span>
        <p style="color:#999;font-size:11px;margin:4px 0 0">New Lead Alert</p>
      </div>
      <div style="padding:24px">
        <h2 style="margin:0 0 16px;color:#0a0a0a;font-size:16px">New lead from <span style="color:#C9A24B">${lead.source}</span></h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr style="background:#f8f8f8"><td style="padding:8px 12px;font-weight:600;color:#555;width:100px;border:1px solid #e5e5e5">Name</td><td style="padding:8px 12px;border:1px solid #e5e5e5;font-weight:600">${lead.name}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Phone</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${lead.phone}</td></tr>
          <tr style="background:#f8f8f8"><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Email</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${lead.email ?? "—"}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Source</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${lead.source}</td></tr>
          <tr style="background:#f8f8f8"><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Message</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${lead.message ?? "—"}</td></tr>
        </table>
        <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap">
          <a href="${waLink}" style="display:inline-block;background:#25d366;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">WhatsApp ${lead.name}</a>
          <a href="https://www.propknown.com/admin/dashboard" style="display:inline-block;background:#C9A24B;color:#000;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Open CRM →</a>
        </div>
        <p style="color:#aaa;font-size:10px;margin-top:20px;border-top:1px solid #e5e5e5;padding-top:12px">PropKnown Infra Pvt Ltd · kiranpropservices@gmail.com · +91 97017 71333</p>
      </div>
    </div>`;
}

export function buildSubmissionHtml(s: {
  title: string; propType: string; bhk?: string; priceDisplay: string;
  city: string; area: string; ownerName: string; ownerPhone: string;
  ownerEmail: string; reraNumber?: string; photoCount: number; docCount: number;
}): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;background:#fff;border-radius:12px;border:1px solid #e5e5e5;overflow:hidden">
      <div style="background:#0a0a0a;padding:20px 24px">
        <span style="color:#C9A24B;font-size:20px;font-weight:800">PROP</span>
        <span style="color:#fff;font-size:20px;font-weight:800">KNOWN</span>
        <p style="color:#999;font-size:11px;margin:4px 0 0">New Property Submission — Review Required</p>
      </div>
      <div style="padding:24px">
        <h2 style="margin:0 0 16px;color:#0a0a0a;font-size:16px">New submission: <span style="color:#C9A24B">${s.title}</span></h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr style="background:#f8f8f8"><td style="padding:8px 12px;font-weight:600;color:#555;width:110px;border:1px solid #e5e5e5">Title</td><td style="padding:8px 12px;border:1px solid #e5e5e5;font-weight:600">${s.title}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Type</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${s.propType}${s.bhk ? " — " + s.bhk : ""}</td></tr>
          <tr style="background:#f8f8f8"><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Location</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${s.area}, ${s.city}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Price</td><td style="padding:8px 12px;border:1px solid #e5e5e5;font-weight:700;color:#C9A24B">${s.priceDisplay}</td></tr>
          <tr style="background:#f8f8f8"><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Owner</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${s.ownerName}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Phone</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${s.ownerPhone}</td></tr>
          <tr style="background:#f8f8f8"><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Email</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${s.ownerEmail}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">RERA</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${s.reraNumber || "Not provided"}</td></tr>
          <tr style="background:#f8f8f8"><td style="padding:8px 12px;font-weight:600;color:#555;border:1px solid #e5e5e5">Files</td><td style="padding:8px 12px;border:1px solid #e5e5e5">${s.photoCount} photo(s), ${s.docCount} doc(s)</td></tr>
        </table>
        <div style="margin-top:20px">
          <a href="https://www.propknown.com/admin/dashboard" style="display:inline-block;background:#C9A24B;color:#000;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Review in Admin Dashboard →</a>
        </div>
        <p style="color:#aaa;font-size:10px;margin-top:20px;border-top:1px solid #e5e5e5;padding-top:12px">PropKnown Infra Pvt Ltd · kiranpropservices@gmail.com · +91 97017 71333</p>
      </div>
    </div>`;
}

export function buildApprovalHtml(opts: {
  action: "approved" | "rejected"; ownerName: string; title: string; reason?: string;
}): string {
  const isApproved = opts.action === "approved";
  return `
    <div style="font-family:sans-serif;max-width:540px;background:#fff;border-radius:12px;border:1px solid #e5e5e5;overflow:hidden">
      <div style="background:#0a0a0a;padding:20px 24px">
        <span style="color:#C9A24B;font-size:20px;font-weight:800">PROP</span>
        <span style="color:#fff;font-size:20px;font-weight:800">KNOWN</span>
      </div>
      <div style="padding:24px">
        <h2 style="color:${isApproved ? "#16a34a" : "#dc2626"};margin:0 0 12px">Your listing has been ${opts.action}</h2>
        <p style="color:#333;font-size:14px">Dear ${opts.ownerName},</p>
        <p style="color:#333;font-size:14px">Your property listing "<strong>${opts.title}</strong>" has been <strong>${opts.action}</strong> by our team.</p>
        ${!isApproved && opts.reason ? `<p style="color:#dc2626;font-size:13px;background:#fef2f2;padding:10px 14px;border-radius:8px;border:1px solid #fecaca">Reason: ${opts.reason}</p>` : ""}
        ${isApproved ? `<p style="color:#333;font-size:13px">Your property is now live on PropKnown and visible to buyers. We will contact you shortly with next steps.</p>` : `<p style="color:#333;font-size:13px">Please make the requested changes and resubmit, or contact us for clarification.</p>`}
        <p style="margin-top:20px;color:#555;font-size:13px">Questions? Call or WhatsApp Raghu: <a href="tel:+919701771333" style="color:#C9A24B;font-weight:700">+91 97017 71333</a></p>
        <p style="color:#aaa;font-size:10px;margin-top:20px;border-top:1px solid #e5e5e5;padding-top:12px">PropKnown Infra Pvt Ltd · kiranpropservices@gmail.com · +91 97017 71333 · Hyderabad</p>
      </div>
    </div>`;
}
