import { prisma } from "@/lib/db";
import { ExternalLink } from "lucide-react";

// M7: infrastructure for an area -- ONLY admin-entered, source-linked entries. Renders nothing
// when there are none (or the table doesn't exist yet). Never AI-generated.
export const INFRA_STATUS: Record<string, string> = { announced: "Announced", approved: "Approved", under_construction: "Under construction", completed: "Completed" };
export const INFRA_KINDS: Record<string, string> = { metro: "Metro", rail: "Rail", road: "Road / flyover", airport: "Airport", it_park: "IT park", hospital: "Hospital", school: "School / university", other: "Other" };

export default async function VerifiedInfra({ citySlug, areaSlug }: { citySlug: string; areaSlug: string }) {
  const rows = await prisma.infraProject.findMany({ where: { citySlug }, orderBy: { verifiedAt: "desc" }, take: 50 }).catch(() => []);
  const mine = rows.filter((r) => r.areaSlugs.split(",").map((s) => s.trim()).includes(areaSlug));
  if (!mine.length) return null;
  return (
    <section className="mt-12">
      <h2 className="heading-h3 mb-1">Infrastructure (verified)</h2>
      <p className="text-xs text-gray-500 mb-4">Only projects confirmed from an official source by PropKnown, each with its source and the date we checked it.</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {mine.map((r) => (
          <li key={r.id} className="card-dark p-4 text-sm">
            <p className="font-semibold">{r.name}</p>
            <p className="text-gray-600">{INFRA_KINDS[r.kind] ?? r.kind} · {INFRA_STATUS[r.status] ?? r.status}{r.expected ? ` · expected ${r.expected} (per source)` : ""}</p>
            <p className="text-[11px] text-gray-500 mt-1">Source: <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline inline-flex items-center gap-0.5">{r.sourceName}<ExternalLink size={10} /></a> · checked {r.verifiedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
