import { prisma } from "@/lib/db";
import { INFRA_KINDS, INFRA_STATUS } from "@/components/area/VerifiedInfra";
import InfraForm from "./InfraForm";
import { deleteInfra } from "./actions";

export const dynamic = "force-dynamic";

// M7: verified infrastructure (master only, via the automation layout). Shown on area pages only
// when the maps flag is on. Add only what an official source confirms, with its link and date.
export default async function InfrastructurePage() {
  let rows: Awaited<ReturnType<typeof prisma.infraProject.findMany>> = [];
  let tableMissing = false;
  try { rows = await prisma.infraProject.findMany({ orderBy: [{ citySlug: "asc" }, { name: "asc" }] }); } catch { tableMissing = true; }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-h3">Verified Infrastructure</h1>
        <p className="text-sm text-gray-500">Metro lines, roads, airports and IT parks shown on area pages. Only add what an official source confirms (government order, authority website, official press release). Never from news rumours or AI.</p>
      </div>
      {tableMissing ? <p className="text-amber-700 text-sm">The infrastructure table isn&apos;t in the database yet (DB push pending).</p> : <InfraForm />}
      <div className="space-y-2">
        {rows.length === 0 && !tableMissing && <p className="text-sm text-gray-500">No entries yet, so area pages show no infrastructure section.</p>}
        {rows.map((r) => (
          <div key={r.id} className="border border-gray-200 rounded-lg p-3 bg-white text-sm flex flex-wrap items-center justify-between gap-2">
            <div><b>{r.name}</b> · {INFRA_KINDS[r.kind] ?? r.kind} · {INFRA_STATUS[r.status] ?? r.status}{r.expected ? ` · ${r.expected}` : ""}<span className="block text-xs text-gray-500">{r.citySlug}: {r.areaSlugs} · <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{r.sourceName}</a> · checked {r.verifiedAt.toLocaleDateString("en-IN")} by {r.verifiedBy}</span></div>
            <form action={deleteInfra}><input type="hidden" name="id" value={r.id} /><button type="submit" className="text-xs text-red-700 underline">Remove</button></form>
          </div>
        ))}
      </div>
    </div>
  );
}
