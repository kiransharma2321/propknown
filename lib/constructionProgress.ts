// Construction Progress Tracker — shared types + preset milestone stages.
// Honesty rule: a listing only shows a tracker when admin has actually added at least one
// dated milestone — there's no separate "under construction" flag to fake or forget to flip.

export interface ConstructionMilestone {
  id: string;
  title: string;       // one of PRESET_MILESTONES or a custom title
  note?: string;
  photoUrl?: string;   // /api/files/{uploadedFileId}
  date: string;        // ISO date (yyyy-mm-dd)
}

export const PRESET_MILESTONES = [
  "Foundation",
  "Structure",
  "Brickwork",
  "Plumbing & Electrical",
  "Finishing",
  "Handover",
];

export function sortMilestones(milestones: ConstructionMilestone[]): ConstructionMilestone[] {
  return [...milestones].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function lastUpdatedDate(milestones: ConstructionMilestone[]): string | null {
  if (milestones.length === 0) return null;
  return sortMilestones(milestones).at(-1)?.date ?? null;
}
