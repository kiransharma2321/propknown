import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

// Branded "Fair-Price Report" PDF. Built from a snapshot of the engine's cached result (the same
// numbers the visitor saw), never from a fresh AI call. Standard PDF fonts can't draw "₹", so
// rupee amounts are written "Rs.".

export interface FairPriceSnapshot {
  name: string;
  locationName: string;
  propertyType: string;
  unitLabel: string;               // "sq.ft" | "sq.yd" | "acre"
  currency: string;                // INR | AED ...
  price: number;
  rangeMin: number | null;
  rangeMax: number | null;
  confidence: { level: string; reason: string } | null;
  guidance: { ratePerUnit: number; sourceName: string; sourceUrl: string | null; effectiveDate: string } | null;
  history: { year: number; value: number }[];
  forecast: { year: number; value: number }[];
  sources: { host: string; url: string }[];
  fetchedAt: string;
  trueCost: { state: string; areaSqft: number; basePrice: number; lines: { label: string; amount: number }[]; total: number; ratesCheckedOn: string } | null;
  generatedAt: string;
  pageUrl: string;
}

const NAVY = rgb(0.06, 0.11, 0.2), GOLD = rgb(0.48, 0.36, 0.1), GREY = rgb(0.4, 0.42, 0.46), LIGHT = rgb(0.9, 0.91, 0.93);
export const PDF_DISCLAIMER = "AI estimate - indicative only, verify with RERA/a lawyer before deciding. Not a certified valuation, legal or financial advice.";

const clean = (s: string) => s
  .replace(/₹\s?/g, "Rs. ").replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, "\"").replace(/·/g, "|").replace(/…/g, "...")
  .replace(/[^\x20-\x7E -ÿ]/g, "");

function money(n: number, currency: string): string {
  const cur = currency === "INR" ? "Rs." : currency;
  if (currency === "INR" && n >= 1e7) return `${cur} ${(n / 1e7).toFixed(2)} Cr`;
  if (currency === "INR" && n >= 1e5) return `${cur} ${(n / 1e5).toFixed(2)} L`;
  return `${cur} ${Math.round(n).toLocaleString(currency === "INR" ? "en-IN" : "en-US")}`;
}
const day = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export async function buildFairPricePdf(s: FairPriceSnapshot): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`PropKnown Fair-Price Report - ${clean(s.locationName)}`);
  doc.setAuthor("PropKnown");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const serif = await doc.embedFont(StandardFonts.TimesRomanBold);
  let page = doc.addPage([595, 842]);
  const M = 44, W = 595 - 2 * M;
  let y = 842;

  const text = (t: string, x: number, size = 10, f: PDFFont = font, color = NAVY) => page.drawText(clean(t), { x, y, size, font: f, color });
  // Wraps a paragraph to the content width and advances y.
  const para = (t: string, size = 9.5, f: PDFFont = font, color = GREY, indent = 0) => {
    const words = clean(t).split(/\s+/);
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(next, size) > W - indent) { ensure(size + 4); page.drawText(line, { x: M + indent, y, size, font: f, color }); y -= size + 4; line = w; }
      else line = next;
    }
    if (line) { ensure(size + 4); page.drawText(line, { x: M + indent, y, size, font: f, color }); y -= size + 4; }
  };
  const ensure = (h: number) => { if (y - h < 60) { footer(page); page = doc.addPage([595, 842]); y = 800; } };
  const heading = (t: string) => { ensure(40); y -= 14; text(t, M, 12.5, serif, NAVY); y -= 8; page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 0.6, color: GOLD }); y -= 14; };
  const footer = (p: PDFPage) => {
    p.drawText(clean(PDF_DISCLAIMER), { x: M, y: 34, size: 7, font, color: GREY });
    p.drawText(clean(`propknown.com | Generated ${day(s.generatedAt)}`), { x: M, y: 24, size: 7, font, color: GREY });
  };

  // Header band
  page.drawRectangle({ x: 0, y: 842 - 92, width: 595, height: 92, color: NAVY });
  page.drawText("PROPKNOWN", { x: M, y: 842 - 46, size: 22, font: serif, color: rgb(0.84, 0.65, 0.24) });
  page.drawText("Fair-Price Report", { x: M, y: 842 - 68, size: 11, font, color: rgb(1, 1, 1) });
  page.drawText(clean(`Prepared for ${s.name} | ${day(s.generatedAt)}`), { x: M + W - font.widthOfTextAtSize(clean(`Prepared for ${s.name} | ${day(s.generatedAt)}`), 9), y: 842 - 68, size: 9, font, color: rgb(0.85, 0.87, 0.9) });
  y = 842 - 126;

  text(`${s.locationName}`, M, 18, serif); y -= 18;
  text(`${s.propertyType.charAt(0).toUpperCase()}${s.propertyType.slice(1)} | market data captured ${day(s.fetchedAt)}`, M, 9.5, font, GREY); y -= 26;

  // Price box
  page.drawRectangle({ x: M, y: y - 74, width: W, height: 84, color: rgb(0.98, 0.97, 0.94), borderColor: GOLD, borderWidth: 0.6 });
  text("AI MARKET ESTIMATE", M + 14, 8, bold, GREY); y -= 26;
  text(`${money(s.price, s.currency)} / ${s.unitLabel}`, M + 14, 22, serif, NAVY);
  if (s.confidence) text(`${s.confidence.level} confidence`, M + W - 14 - bold.widthOfTextAtSize(`${s.confidence.level} confidence`, 10), 10, bold, GOLD);
  y -= 18;
  if (s.rangeMin && s.rangeMax) text(`Realistic range: ${money(s.rangeMin, s.currency)} - ${money(s.rangeMax, s.currency)} / ${s.unitLabel}`, M + 14, 9.5, font, GREY);
  y -= 13;
  if (s.confidence) text(s.confidence.reason, M + 14, 8.5, font, GREY);
  y -= 30;

  // Three-way view
  heading("Price at a glance");
  const g = s.guidance;
  [["Govt guidance value", g ? `${money(g.ratePerUnit, s.currency)} / ${s.unitLabel} (${g.sourceName}, effective ${day(g.effectiveDate)})` : "Not available for this area yet"],
   ["AI market estimate", `${money(s.price, s.currency)} / ${s.unitLabel} (from the sources listed below)`]].forEach(([k, v]) => {
    ensure(16); text(k, M, 9.5, bold); page.drawText(clean(v), { x: M + 130, y, size: 9.5, font, color: GREY }); y -= 16;
  });

  // Trend chart
  const pts = [...s.history, ...s.forecast];
  if (pts.length >= 2) {
    heading("5-year trend and forecast (illustrative)");
    ensure(170);
    const cx = M + 40, cw = W - 50, ch = 120, cy = y - ch;
    const vals = pts.map((p) => p.value), lo = Math.min(...vals) * 0.95, hi = Math.max(...vals) * 1.05;
    const X = (i: number) => cx + (i / (pts.length - 1)) * cw;
    const Y = (v: number) => cy + ((v - lo) / (hi - lo || 1)) * ch;
    page.drawLine({ start: { x: cx, y: cy }, end: { x: cx + cw, y: cy }, thickness: 0.5, color: LIGHT });
    for (let k = 0; k <= 3; k++) {
      const v = lo + ((hi - lo) * k) / 3, yy = Y(v);
      page.drawLine({ start: { x: cx, y: yy }, end: { x: cx + cw, y: yy }, thickness: 0.3, color: LIGHT });
      page.drawText(clean(Math.round(v).toLocaleString("en-IN")), { x: M - 2, y: yy - 3, size: 6.5, font, color: GREY });
    }
    pts.forEach((p, i) => {
      if (i > 0) {
        const fore = i >= s.history.length;
        page.drawLine({ start: { x: X(i - 1), y: Y(pts[i - 1].value) }, end: { x: X(i), y: Y(p.value) }, thickness: 1.6, color: fore ? GOLD : NAVY, dashArray: fore ? [3, 2] : undefined });
      }
      page.drawCircle({ x: X(i), y: Y(p.value), size: 1.8, color: i >= s.history.length ? GOLD : NAVY });
      page.drawText(String(p.year), { x: X(i) - 9, y: cy - 12, size: 6.5, font, color: GREY });
    });
    y = cy - 28;
    para("Solid line: modelled history. Dashed line: AI forecast. Only today's price is grounded in live sources; the trend is an AI projection, not records or a guarantee.", 8);
    if (s.forecast.length) {
      ensure(14);
      para(`Forecast: ${s.forecast.map((f) => `${f.year}: ${money(f.value, s.currency)}`).join("  |  ")}`, 8.5, font, NAVY);
    }
  }

  // True cost
  if (s.trueCost) {
    const t = s.trueCost;
    heading(`True cost estimate (${Math.round(t.areaSqft).toLocaleString("en-IN")} sq.ft example, ${t.state})`);
    for (const l of t.lines.filter((l) => l.amount > 0)) {
      ensure(14); text(l.label, M, 9.5, font, GREY);
      const v = money(l.amount, "INR"); page.drawText(clean(v), { x: M + W - font.widthOfTextAtSize(clean(v), 9.5), y, size: 9.5, font, color: NAVY }); y -= 14;
    }
    ensure(18); text("Total", M, 10.5, bold); const tv = money(t.total, "INR");
    page.drawText(clean(tv), { x: M + W - bold.widthOfTextAtSize(clean(tv), 10.5), y, size: 10.5, font: bold, color: GOLD }); y -= 16;
    para(`Base price = AI estimate x example size. Government rates checked ${day(t.ratesCheckedOn)}; builder charges not included. Use propknown.com/true-cost with your own numbers.`, 8);
  }

  // Sources
  heading("How we got this number");
  para(`An AI model read the following sources on ${day(s.fetchedAt)} and extracted the typical rate for this area. City-wide averages are not used as a local price.`, 9);
  if (s.sources.length === 0) para("Sources unavailable for this result.", 9, bold, NAVY);
  for (const src of s.sources) {
    const bareDomain = /^https?:\/\/[^/]+\/?$/.test(src.url);
    ensure(13);
    para(`- ${src.host}${bareDomain ? "" : `  (${src.url.slice(0, 95)})`}  read ${day(s.fetchedAt)}`, 8.5, font, NAVY, 6);
  }
  if (g) para(`Govt guidance value: ${g.sourceName}${g.sourceUrl ? ` (${g.sourceUrl})` : ""}, effective ${day(g.effectiveDate)}.`, 8.5, font, NAVY);

  heading("Before you decide");
  para("Check the project's RERA registration, get the title documents checked by a lawyer, and compare at least three listings in the same project or street.", 9);
  para(`Free tools: Price Check, Fraud & RERA check and True Cost at ${s.pageUrl.replace(/^https?:\/\//, "")}`, 9, font, NAVY);

  footer(page);
  return doc.save();
}
