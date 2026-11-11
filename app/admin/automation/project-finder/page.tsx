import Link from "next/link";
import { prisma } from "@/lib/db";
import { runFinderAction } from "./actions";

export const dynamic = "force-dynamic";

// Automatic RERA project import. Each source was checked for its terms before any fetching was
// built; a source is only fetched automatically once it is "allowed". None is as of Nov 2026, so
// the import cron is not scheduled -- new projects come in through Quick Add instead.
const SOURCES = [
  { name: "Telangana RERA (TG RERA)", url: "https://rerait.telangana.gov.in/SearchList/Search", status: "Skipped",
    why: "Project search is behind a CAPTCHA. Automating it would mean bypassing bot protection, which we don't do." },
  { name: "Karnataka RERA", url: "https://rera.karnataka.gov.in/viewAllProjects", status: "Needs permission",
    why: "Copyright policy: material may be reproduced only after taking permission by email; the project list page is marked noindex. Enable once written permission is received." },
  { name: "MahaRERA (Maharashtra)", url: "https://maharera.maharashtra.gov.in/", status: "Skipped",
    why: "The site refuses automated requests (403, even for robots.txt)." },
  { name: "Dubai Land Department", url: "https://dubailand.gov.ae/en/open-data/real-estate-data/", status: "Skipped",
    why: "Data tool is behind a CAPTCHA. The Dubai Pulse open dataset is licensed but last updated April 2024." },
];

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function ProjectFinderPage() {
  const drafts = await prisma.listingDraft
    .findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, projectName: true, reraNumber: true, sourceName: true, sourceUrl: true, origin: true, reviewStatus: true, createdAt: true } })
    .catch(() => null);

  return (
    <div>
      <h1 className="heading-h3">Project Finder</h1>
      <p className="text-gray-500 text-sm mb-5 max-w-3xl">
        Newly registered projects become AI-drafted listings in the <Link href="/admin/approval-queue" className="underline">Approval Queue</Link>, de-duplicated by RERA number.
        Each public source was checked for its terms first. A source is only fetched automatically when its terms allow it.
      </p>

      <h2 className="font-semibold text-gray-900 mb-2">Sources</h2>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-400 text-xs"><th className="py-2 pr-3">Source</th><th className="pr-3">Automatic fetch</th><th>Why</th></tr></thead>
          <tbody>
            {SOURCES.map((s) => (
              <tr key={s.name} className="border-t border-gray-100 align-top">
                <td className="py-2 pr-3"><a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.name}</a></td>
                <td className="pr-3 whitespace-nowrap">{s.status}</td>
                <td className="text-gray-600">{s.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border border-gray-200 rounded-xl bg-white p-4 mb-8 text-sm flex flex-wrap items-center justify-between gap-3">
        <p className="text-gray-600 max-w-2xl"><b>PropKnown project checks</b> (allowed source): every project checked with sources becomes a draft, with only the facts and asking rates the cited websites state. A RERA number from a website is marked &quot;verify on the RERA portal&quot;.</p>
        <form action={runFinderAction}><button className="btn-primary text-sm">Run finder now</button></form>
      </div>

      <h2 className="font-semibold text-gray-900 mb-2">Drafted projects</h2>
      {drafts === null ? (
        <p className="text-sm text-amber-800">The listing_drafts table hasn&apos;t been created yet: run the pending database update first.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-400 text-xs"><th className="py-2 pr-3">Project</th><th className="pr-3">RERA no.</th><th className="pr-3">Source</th><th className="pr-3">Status</th><th>Added</th></tr></thead>
            <tbody>
              {drafts.length === 0 && <tr><td colSpan={5} className="py-3 text-gray-400">No projects drafted yet. Use Quick Add in the Approval Queue.</td></tr>}
              {drafts.map((d) => (
                <tr key={d.id} className="border-t border-gray-100">
                  <td className="py-2 pr-3"><Link href={`/admin/approval-queue/${d.id}`} className="underline">{d.projectName}</Link></td>
                  <td className="pr-3">{d.reraNumber ?? "—"}</td>
                  <td className="pr-3">{d.sourceUrl ? <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{d.sourceName ?? "link"}</a> : d.sourceName ?? d.origin}</td>
                  <td className="pr-3 capitalize">{d.reviewStatus}</td>
                  <td className="tabular-nums">{day(d.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
