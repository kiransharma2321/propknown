// The 10-point approval checklist -- every item must be ticked by a human before a listing can
// be approved and published. Shared by the admin dashboard and the Approval Queue.
export const CHECKLIST_ITEMS = [
  "RERA or HMDA number verified",
  "Owner identity verified",
  "Title deed checked with no disputes",
  "Real photos - not stock images",
  "Accurate price within 20% of market rate",
  "Correct area measurement and unit",
  "Owner consent obtained",
  "No false or misleading claims",
  "Location pinned correctly on map",
  "Contact details verified and working",
] as const;

export function normaliseChecklist(v: unknown): boolean[] {
  const arr = Array.isArray(v) ? v : [];
  return CHECKLIST_ITEMS.map((_, i) => arr[i] === true);
}
