// Broker portal CSV upload: parsing + row checks (pure, unit-tested). Brokers list resale or
// channel-partner stock they are authorised to market. Owner names / phones / emails are not
// collected -- enquiries come to PropKnown and go to the broker through the CRM.

export const CSV_COLUMNS = ["title", "property_type", "locality", "city", "price", "size", "size_unit", "bhk", "approval_type", "approval_number", "description"] as const;
export const OWNERSHIP_DECLARATION = "I confirm that, for every property in this file, I am the owner or I hold the owner's written authorisation to market it, that the details are accurate, and that I will remove any property that is no longer available.";
const TYPES = ["apartment", "villa", "house", "plot", "commercial", "agriculture"];
export const MAX_ROWS = 200;

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

export interface BrokerRow { title: string; propertyType: string; locality: string; city: string; price: number | null; size: number | null; sizeUnit: string; bhk: string | null; approvalType: string | null; approvalNumber: string | null; description: string | null }

const CONTACT = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/i;

export function rowsFromCsv(text: string): { rows: BrokerRow[]; errors: string[] } {
  const all = parseCsv(text.replace(/^﻿/, ""));
  if (!all.length) return { rows: [], errors: ["The file is empty."] };
  const head = all[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const missingCols = ["title", "property_type", "locality", "city"].filter((c) => !head.includes(c));
  if (missingCols.length) return { rows: [], errors: [`Missing columns: ${missingCols.join(", ")}. Expected: ${CSV_COLUMNS.join(", ")}`] };
  const rows: BrokerRow[] = [], errors: string[] = [];
  const body = all.slice(1, MAX_ROWS + 1);
  for (let i = 0; i < body.length; i++) {
    const r = body[i];
    const g = (c: string) => (r[head.indexOf(c)] ?? "").trim();
    const line = i + 2;
    const type = g("property_type").toLowerCase();
    if (!g("title") || !g("locality") || !g("city")) { errors.push(`Row ${line}: title, locality and city are required.`); continue; }
    if (!TYPES.includes(type)) { errors.push(`Row ${line}: property_type must be one of ${TYPES.join(", ")}.`); continue; }
    const text = [g("title"), g("description")].join(" ");
    if (CONTACT.test(text)) { errors.push(`Row ${line}: remove phone numbers / emails from the title and description (enquiries come through PropKnown).`); continue; }
    const num = (s: string) => { const n = Number(s.replace(/[₹,\s]/g, "")); return Number.isFinite(n) && n > 0 ? n : null; };
    rows.push({
      title: g("title").slice(0, 150), propertyType: type, locality: g("locality").slice(0, 100), city: g("city").slice(0, 60),
      price: num(g("price")), size: num(g("size")), sizeUnit: ["sqft", "sqyd", "acre"].includes(g("size_unit").toLowerCase()) ? g("size_unit").toLowerCase() : "sqft",
      bhk: g("bhk") || null, approvalType: g("approval_type").toUpperCase() || null, approvalNumber: g("approval_number").toUpperCase() || null,
      description: g("description").slice(0, 1500) || null,
    });
  }
  if (all.length - 1 > MAX_ROWS) errors.push(`Only the first ${MAX_ROWS} rows were read.`);
  return { rows, errors };
}

export const sqftOf = (r: BrokerRow) => (r.size ? (r.sizeUnit === "sqyd" ? r.size * 9 : r.sizeUnit === "acre" ? r.size * 43_560 : r.size) : null);
