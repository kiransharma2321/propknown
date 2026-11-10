// M5 Document Checker: constants and types shared with the browser. Kept separate from
// lib/documentChecker.ts, which imports the server-only AI client.

export const DOC_TYPES = {
  sale_deed: "Sale deed",
  ec: "Encumbrance certificate (EC)",
  approval: "Building / layout approval",
  agreement: "Agreement of sale",
  rera: "RERA certificate",
  tax: "Property tax receipt",
  other: "Other",
} as const;
export type DocType = keyof typeof DOC_TYPES;

export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const MAX_BYTES = 10 * 1024 * 1024;
export const RETENTION_DAYS = 30;
export const DOC_DISCLAIMER = "Preliminary AI reading, not legal advice. A PropKnown reviewer will check it, and you should have a property lawyer verify the original documents before you pay anything.";

export interface DocResult {
  language: string;
  documentType: string;
  legible: boolean;
  summary: string;
  keyFields: { label: string; value: string; quote: string }[];
  redFlags: { issue: string; why: string; quote: string; severity: "high" | "medium" | "low" }[];
  unclear: string[];
  whatToVerify: string[];
  embeddedInstructions: boolean;
  embeddedInstructionsQuote: string | null;
  risk: "high" | "medium" | "low" | "none_found";
  disclaimer: string;
}
