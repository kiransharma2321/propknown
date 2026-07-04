// PropKnown Legal Safety Checklist — shared types + item definitions.
// Honesty rule: statuses are admin-set only, never inferred/fabricated. Default state for
// every item is "pending" (not yet checked) — never defaults to "verified".

export type ChecklistStatus = "verified" | "pending" | "na";

export interface LegalChecklistItem {
  key: string;
  label: string;
  why: string; // short "why this matters" tooltip copy
}

export const LEGAL_CHECKLIST_ITEMS: LegalChecklistItem[] = [
  { key: "rera",        label: "RERA Registration",        why: "Confirms the project/builder is registered with the state RERA authority, giving you legal recourse for delays or misrepresentation." },
  { key: "title",       label: "Clear Title / Ownership",  why: "Verifies the seller actually owns the property free of disputes, so you don't inherit someone else's legal problem." },
  { key: "encumbrance", label: "Encumbrance Certificate",   why: "Shows the property has no outstanding loans, mortgages, or legal claims registered against it." },
  { key: "layout",      label: "Approved Layout (HMDA/DTCP)", why: "Confirms the land was legally converted and laid out per municipal norms — unapproved layouts can be demolished or denied utilities." },
  { key: "permissions", label: "Building Permissions",      why: "Checks construction matches the sanctioned building plan — unauthorized floors/extensions can be penalized or demolished." },
  { key: "taxReceipts", label: "Property Tax Receipts",     why: "Confirms property tax is paid up to date, so you don't inherit a tax liability from the previous owner." },
  { key: "occupancy",   label: "Occupancy Certificate",     why: "Required for ready/completed properties — confirms the local authority certified the building safe and fit for occupation." },
  { key: "saleDeedChain", label: "Sale Deed Chain",         why: "Traces ownership through past transactions to confirm an unbroken, legitimate chain of title." },
  { key: "litigation",  label: "No Pending Litigation",     why: "Confirms there's no ongoing court case or dispute over the property that could freeze or invalidate a sale." },
];

export type LegalChecklist = Record<string, ChecklistStatus>;

export function checklistSummary(checklist: LegalChecklist): { verified: number; pending: number; na: number; total: number } {
  let verified = 0, pending = 0, na = 0;
  for (const item of LEGAL_CHECKLIST_ITEMS) {
    const status = checklist[item.key] ?? "pending";
    if (status === "verified") verified++;
    else if (status === "na") na++;
    else pending++;
  }
  return { verified, pending, na, total: LEGAL_CHECKLIST_ITEMS.length };
}
