import { escapeHtml as esc } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { layout } from "@/lib/emails/templates";

// M2 emails for My PropKnown customer accounts.

export function otpEmail(code: string): { subject: string; html: string } {
  return {
    subject: "Your PropKnown login code",
    html: layout({
      preheader: "Your one-time code (valid 10 minutes)",
      body: `<p>Your PropKnown login code is:</p>
<p style="font-size:32px;font-weight:800;letter-spacing:8px;margin:12px 0">${esc(code)}</p>
<p>It works once and expires in 10 minutes. If you didn't ask for it, ignore this email: nobody can log in without the code.</p>`,
      footerNote: "We will never ask you to share this code by phone or WhatsApp.",
    }),
  };
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const day = (d: Date | null) => (d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "date not recorded");

export function priceWatchEmail(o: {
  label: string; link: string; prev: number; prevDate: Date | null; next: number; nextDate: Date | null;
  pct: number; sources: number; confidence: string | null; stopUrl: string; unsubscribeUrl: string;
}): { subject: string; html: string } {
  const dir = o.pct > 0 ? "up" : "down";
  return {
    subject: `${o.label}: asking price ${dir} ${Math.abs(o.pct)}%`,
    html: layout({
      preheader: `${o.label}: ${inr(o.prev)} → ${inr(o.next)}/sq.ft`,
      body: `<p>A price you're watching has moved.</p>
<p style="font-size:16px;font-weight:700;margin:8px 0">${esc(o.label)}</p>
<table style="border-collapse:collapse;font-size:14px">
<tr><td style="padding:4px 12px 4px 0;color:#666">Before</td><td>${inr(o.prev)}/sq.ft <span style="color:#999">(captured ${day(o.prevDate)})</span></td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">Now</td><td><b>${inr(o.next)}/sq.ft</b> <span style="color:#999">(captured ${day(o.nextDate)})</span></td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">Change</td><td>${o.pct > 0 ? "+" : ""}${o.pct}%</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">Based on</td><td>${o.sources} website${o.sources === 1 ? "" : "s"}${o.confidence ? ` · ${esc(o.confidence)} confidence` : ""}</td></tr>
</table>
<p style="color:#666;font-size:12px">These are asking prices from public listings (an AI estimate), not registered sale prices. Verify before you decide.</p>
<p><a href="${o.link}" style="color:#8a6a2e;font-weight:700">See the sources and details</a></p>
<p style="font-size:12px"><a href="${o.stopUrl}" style="color:#999">Stop alerts for this item</a> · <a href="${SITE_URL}/account" style="color:#999">Manage my watchlist</a></p>`,
      unsubscribeUrl: o.unsubscribeUrl,
    }),
  };
}
