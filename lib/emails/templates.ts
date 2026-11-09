import { escapeHtml as esc } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { unitLabel } from "@/lib/engine";

// Branded HTML for the automation emails. Every number shown comes from the shared engine's
// cached data passed in by the caller -- templates never compute or invent a figure.

const GOLD = "#C9A24B";

export function layout(opts: { preheader: string; body: string; unsubscribeUrl?: string; footerNote?: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f4;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${esc(opts.preheader)}</span>
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e5e5;overflow:hidden">
  <div style="background:#0a0a0a;padding:20px 24px">
    <a href="${SITE_URL}" style="text-decoration:none"><span style="color:${GOLD};font-size:20px;font-weight:800">PROP</span><span style="color:#fff;font-size:20px;font-weight:800">KNOWN</span></a>
    <p style="color:#999;font-size:11px;margin:4px 0 0;letter-spacing:1px">KNOW. INVEST. GROW.</p>
  </div>
  <div style="padding:24px;color:#222;font-size:14px;line-height:1.6">${opts.body}</div>
  <div style="padding:16px 24px;border-top:1px solid #eee;color:#999;font-size:11px;line-height:1.5">
    ${opts.footerNote ? `${opts.footerNote}<br>` : ""}
    PropKnown Infra Pvt Ltd · Nizampet Road, Hyderabad 500090 · +91 70130 16003
    ${opts.unsubscribeUrl ? `<br><a href="${opts.unsubscribeUrl}" style="color:#999">Unsubscribe from PropKnown marketing emails</a> (one click)` : ""}
  </div>
</div></body></html>`;
}

const button = (href: string, label: string, bg = GOLD, color = "#000") =>
  `<a href="${href}" style="display:inline-block;background:${bg};color:${color};padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;margin:4px 6px 4px 0">${esc(label)}</a>`;

export interface MarketSnapshot {
  locationName: string;
  currencySymbol: string;
  currentPricePerSqft: number;
  priceRangeMin?: number;
  priceRangeMax?: number;
  pricePerSqftUnit?: string;
  growthRate?: number | null;
  rentalYield?: number | null;
  trend?: string;
  priceForecast5yr?: { year: number; value: number }[];
  fetchedAt?: string;
  dataSourceLabel?: string;
}

const money = (sym: string, n: number) => `${esc(sym)}${Math.round(n).toLocaleString("en-IN")}`;

function marketBlock(m: MarketSnapshot): string {
  const u = unitLabel(m.pricePerSqftUnit);
  const rows = (m.priceForecast5yr ?? []).map((p) =>
    `<tr><td style="padding:6px 10px;border:1px solid #eee">${p.year}</td><td style="padding:6px 10px;border:1px solid #eee;text-align:right">${money(m.currencySymbol, p.value)}/${u}</td></tr>`).join("");
  return `
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0">
    <tr style="background:#faf7ef"><td style="padding:8px 10px;border:1px solid #eee;font-weight:700">Typical rate today</td><td style="padding:8px 10px;border:1px solid #eee;text-align:right;font-weight:700;color:#7A5C1A">${money(m.currencySymbol, m.currentPricePerSqft)}/${u}</td></tr>
    ${m.priceRangeMin && m.priceRangeMax ? `<tr><td style="padding:8px 10px;border:1px solid #eee">Realistic range</td><td style="padding:8px 10px;border:1px solid #eee;text-align:right">${money(m.currencySymbol, m.priceRangeMin)} – ${money(m.currencySymbol, m.priceRangeMax)}/${u}</td></tr>` : ""}
    ${m.growthRate != null ? `<tr><td style="padding:8px 10px;border:1px solid #eee">Estimated annual growth</td><td style="padding:8px 10px;border:1px solid #eee;text-align:right">${m.growthRate}%</td></tr>` : ""}
    ${m.rentalYield != null ? `<tr><td style="padding:8px 10px;border:1px solid #eee">Estimated gross rental yield</td><td style="padding:8px 10px;border:1px solid #eee;text-align:right">${m.rentalYield}%</td></tr>` : ""}
    ${m.trend ? `<tr><td style="padding:8px 10px;border:1px solid #eee">Trend</td><td style="padding:8px 10px;border:1px solid #eee;text-align:right">${esc(m.trend)}</td></tr>` : ""}
  </table>
  ${rows ? `<p style="font-weight:700;margin:18px 0 4px">5-year forecast <span style="font-weight:400;color:#888;font-size:12px">(illustrative AI projection, not a guarantee)</span></p>
  <table style="width:100%;border-collapse:collapse;font-size:13px">${rows}</table>` : `<p style="color:#888;font-size:12px">A 5-year forecast wasn't available for this area in today's data.</p>`}
  <p style="color:#888;font-size:11px;margin-top:10px">${esc(m.dataSourceLabel ?? "AI estimate based on live web search")}${m.fetchedAt ? ` · last updated ${new Date(m.fetchedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}. AI estimate, not a certified valuation — always verify before you buy.</p>`;
}

export function reportEmail(opts: {
  name: string; toolLabel: string; location: string; propertyLabel: string;
  market: MarketSnapshot | null; verdictLine?: string; reraLine?: string; riskLine?: string;
  link: string; whatsappLink: string; unsubscribeUrl: string;
}): { subject: string; html: string } {
  const subject = `Your PropKnown report: ${opts.location} ${opts.propertyLabel}`.slice(0, 120);
  const body = `
    <p>Hi ${esc(opts.name)},</p>
    <p>Here's the full ${esc(opts.toolLabel)} report you asked for — <strong>${esc(opts.propertyLabel)} in ${esc(opts.location)}</strong>.</p>
    ${opts.verdictLine ? `<p style="background:#faf7ef;border:1px solid #eadfc3;border-radius:8px;padding:10px 14px">${esc(opts.verdictLine)}</p>` : ""}
    ${opts.riskLine ? `<p style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px">${esc(opts.riskLine)}</p>` : ""}
    ${opts.market ? marketBlock(opts.market) : `<p style="background:#f8f8f8;border-radius:8px;padding:10px 14px">Live market data for ${esc(opts.location)} wasn't available when you asked, so this report has no price figures — we don't guess. Our team will check it manually; reply to this email or WhatsApp us any time.</p>`}
    ${opts.reraLine ? `<p style="font-size:13px"><strong>RERA:</strong> ${esc(opts.reraLine)}</p>` : ""}
    <p style="margin-top:20px">${button(opts.link, "See live prices on PropKnown")}${button(opts.whatsappLink, "WhatsApp an advisor", "#25D366", "#fff")}</p>`;
  return {
    subject,
    html: layout({ preheader: `Prices, range and 5-year outlook for ${opts.location}`, body, unsubscribeUrl: opts.unsubscribeUrl,
      footerNote: "You're receiving this because you requested a report on propknown.com." }),
  };
}

export function day2Email(opts: {
  name: string; location: string; propertyLabel: string;
  nearby: { name: string; snapshot: MarketSnapshot | null; link: string }[];
  link: string; unsubscribeUrl: string;
}): { subject: string; html: string } {
  const withData = opts.nearby.filter((n) => n.snapshot);
  const rows = withData.map((n) => {
    const s = n.snapshot!;
    return `<tr><td style="padding:7px 10px;border:1px solid #eee"><a href="${n.link}" style="color:#222">${esc(n.name)}</a></td><td style="padding:7px 10px;border:1px solid #eee;text-align:right">${money(s.currencySymbol, s.currentPricePerSqft)}/${unitLabel(s.pricePerSqftUnit)}</td><td style="padding:7px 10px;border:1px solid #eee;text-align:right;color:#888;font-size:11px">${s.fetchedAt ? new Date(s.fetchedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}</td></tr>`;
  }).join("");
  const body = `
    <p>Hi ${esc(opts.name)},</p>
    <p>Two days ago you looked at ${esc(opts.propertyLabel)} prices in <strong>${esc(opts.location)}</strong>. Buyers usually compare a few nearby areas before deciding — here's what PropKnown's live engine shows close by:</p>
    ${rows ? `<table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0"><tr style="background:#faf7ef;font-weight:700"><td style="padding:7px 10px;border:1px solid #eee">Locality</td><td style="padding:7px 10px;border:1px solid #eee;text-align:right">Typical rate</td><td style="padding:7px 10px;border:1px solid #eee;text-align:right">Updated</td></tr>${rows}</table>
    <p style="color:#888;font-size:11px">AI estimates from live web data, not certified valuations.</p>`
    : `<p>We're still refreshing prices for the localities around ${esc(opts.location)} — you can see what's live right now on our price pages.</p>`}
    <p style="margin-top:18px">${button(opts.link, "Compare nearby prices")}</p>`;
  return {
    subject: `Prices near ${opts.location}`.slice(0, 120),
    html: layout({ preheader: `How ${opts.location} compares with the areas around it`, body, unsubscribeUrl: opts.unsubscribeUrl }),
  };
}

export function day5Email(opts: { name: string; location: string; whatsappLink: string; unsubscribeUrl: string }): { subject: string; html: string } {
  const body = `
    <p>Hi ${esc(opts.name)},</p>
    <p>If you're seriously considering a property in or around <strong>${esc(opts.location)}</strong>, a 20-minute call with a PropKnown advisor can save you a lot of guesswork — free, and with no obligation.</p>
    <ul style="padding-left:18px">
      <li>A second opinion on any price you've been quoted</li>
      <li>What to check before paying a token amount — RERA, title, approvals</li>
      <li>Which nearby pockets fit your budget and timeline</li>
    </ul>
    <p style="margin-top:18px">${button(opts.whatsappLink, "Book a free consultation on WhatsApp", "#25D366", "#fff")}${button("tel:+917013016003", "Call +91 70130 16003", "#0a0a0a", "#fff")}</p>
    <p style="color:#888;font-size:12px">This is the last email in this series.</p>`;
  return {
    subject: "Free consultation with PropKnown",
    html: layout({ preheader: "A free, no-obligation call with a PropKnown advisor", body, unsubscribeUrl: opts.unsubscribeUrl }),
  };
}

// Owner alert sent once for every new lead; hot leads (AI score >= HOT_LEAD_SCORE) are flagged
// with "🔥 HOT" in the subject so they stand out in the inbox.
export function leadAlertEmail(opts: {
  hot: boolean; name: string; phone: string; email?: string | null; search: string; score?: number | null;
  summary?: string | null; message?: string | null; reason: string; waToLead: string; crmLink: string;
}): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 6px;font-size:18px">${opts.hot ? "🔥 HOT lead" : "New lead"}: ${esc(opts.name)}</h2>
    <p style="margin:0 0 14px;color:#666">${esc(opts.reason)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr><td style="padding:7px 10px;border:1px solid #eee;font-weight:700;width:120px">Name</td><td style="padding:7px 10px;border:1px solid #eee">${esc(opts.name)}</td></tr>
      <tr><td style="padding:7px 10px;border:1px solid #eee;font-weight:700">Phone</td><td style="padding:7px 10px;border:1px solid #eee"><a href="tel:${esc(opts.phone)}">${esc(opts.phone)}</a></td></tr>
      <tr><td style="padding:7px 10px;border:1px solid #eee;font-weight:700">Email</td><td style="padding:7px 10px;border:1px solid #eee">${esc(opts.email ?? "—")}</td></tr>
      <tr><td style="padding:7px 10px;border:1px solid #eee;font-weight:700">Searched</td><td style="padding:7px 10px;border:1px solid #eee">${esc(opts.search)}</td></tr>
      ${opts.score != null ? `<tr><td style="padding:7px 10px;border:1px solid #eee;font-weight:700">AI lead score</td><td style="padding:7px 10px;border:1px solid #eee">${opts.score}/100</td></tr>` : ""}
      ${opts.summary ? `<tr><td style="padding:7px 10px;border:1px solid #eee;font-weight:700">AI summary</td><td style="padding:7px 10px;border:1px solid #eee">${esc(opts.summary)}</td></tr>` : ""}
      ${opts.message ? `<tr><td style="padding:7px 10px;border:1px solid #eee;font-weight:700">Message</td><td style="padding:7px 10px;border:1px solid #eee">${esc(opts.message)}</td></tr>` : ""}
    </table>
    <p style="margin-top:18px">${button(opts.waToLead, `WhatsApp ${opts.name} now`, "#25D366", "#fff")}${button(opts.crmLink, "Open in CRM")}</p>`;
  const subject = `${opts.hot ? "🔥 HOT lead" : "New lead"}: ${opts.name} — ${opts.search}`.slice(0, 140);
  return { subject, html: layout({ preheader: `${opts.name} · ${opts.phone}`, body }) };
}
