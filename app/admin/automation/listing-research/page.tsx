import Link from "next/link";
import { prisma } from "@/lib/db";
import { FEATURES } from "@/lib/features";
import { RESEARCH_CITIES, CATEGORIES } from "@/lib/research/rules";
import { configuredProviders } from "@/lib/ai/router";
import { configuredSearch } from "@/lib/search";
import { runNowAction, outreachStatusAction } from "./actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Auto Listing Researcher (master only via the automation layout).
export default async function ListingResearchPage() {
  if (!FEATURES.listingResearcher) return <p className="text-sm text-gray-500">The Listing Researcher is switched off (feature flag NEXT_PUBLIC_FEATURE_LISTING_RESEARCHER).</p>;
  let runs: Awaited<ReturnType<typeof prisma.researchRun.findMany>> = [], tasks: Awaited<ReturnType<typeof prisma.outreachTask.findMany>> = [];
  try {
    [runs, tasks] = await Promise.all([
      prisma.researchRun.findMany({ orderBy: { startedAt: "desc" }, take: 15 }),
      prisma.outreachTask.findMany({ where: { status: { in: ["open", "sent"] } }, orderBy: { createdAt: "desc" }, take: 60 }),
    ]);
  } catch { return <p className="text-amber-700 text-sm">The research tables aren&apos;t in the database yet (DB push pending).</p>; }
  const ai = configuredProviders(), search = configuredSearch();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="heading-h3">Listing Research</h1>
        <p className="text-sm text-gray-500 max-w-3xl">Finds projects on sale now from public pages (robots.txt respected). Only facts each source states are kept, with the link and date. Descriptions are written by us. No page text or photos are copied, and no individual resale sellers or contact details are collected. Results go to the <Link href="/admin/approval-queue?origin=research" className="underline">Approval Queue</Link>. Runs daily (one city per day) and re-checks live listings every 2 weeks.</p>
        <p className="text-xs text-gray-500 mt-1">Free AI: {ai.join(" → ") || "none configured"} · Search: {search.join(" → ") || "none configured"}</p>
      </div>
      <form action={runNowAction} className="border border-gray-200 rounded-xl bg-white p-4 flex flex-wrap items-end gap-4 text-sm">
        <label className="text-xs text-gray-700">City<select name="city" className="input-dark text-sm py-2 px-2 mt-0.5 block">{RESEARCH_CITIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <div className="flex flex-wrap gap-3">{CATEGORIES.map((c) => <label key={c.id} className="flex items-center gap-1 text-xs"><input type="checkbox" name={`cat_${c.id}`} defaultChecked={c.id !== "commercial"} /> {c.label}</label>)}</div>
        <button className="btn-primary text-sm">Run research now</button>
        <p className="text-xs text-gray-400 w-full">Takes 1–4 minutes. Uses free-tier AI and search quotas.</p>
      </form>

      <section>
        <h2 className="font-semibold mb-2">Recent runs</h2>
        <table className="w-full text-xs"><thead><tr className="text-left text-gray-400"><th className="py-1">Started</th><th>City</th><th>Trigger</th><th>Result</th></tr></thead><tbody>
          {runs.map((r) => { const s = (r.stats ?? {}) as Record<string, number>; return (
            <tr key={r.id} className="border-t border-gray-100"><td className="py-1.5">{r.startedAt.toLocaleString("en-IN")}</td><td>{r.city}</td><td>{r.trigger}{r.startedBy ? ` (${r.startedBy})` : ""}</td>
              <td>{r.finishedAt ? `${s.drafted ?? 0} drafts from ${s.candidates ?? 0} found · ${s.duplicates ?? 0} duplicates · ${s.robotsBlocked ?? 0} pages blocked by robots.txt · ${s.resaleSkipped ?? 0} resale pages skipped${s.errors ? ` · ${s.errors} errors` : ""}` : "running / stopped"}</td></tr>); })}
          {runs.length === 0 && <tr><td colSpan={4} className="py-2 text-gray-400">No runs yet.</td></tr>}
        </tbody></table>
      </section>

      <section>
        <h2 className="font-semibold mb-1">Outreach tasks</h2>
        <p className="text-xs text-gray-500 mb-2">Ask builders for photos (with written permission to use them) and missing details. Nothing is sent automatically. Until photos arrive, a listing shows no project photos, or a licensed area image labelled &quot;Representative image of the area&quot;. AI images are never shown as the property.</p>
        <div className="space-y-2">
          {tasks.map((t) => (
            <form key={t.id} action={outreachStatusAction} className="border border-gray-200 rounded-lg bg-white p-3 text-sm flex flex-wrap items-center gap-3">
              <input type="hidden" name="id" value={t.id} />
              <div className="flex-1 min-w-[240px]"><b>{t.kind === "request_photos" ? "Request photos" : "Request details"}</b>: {t.projectName}{t.builder ? ` · ${t.builder}` : ""}
                {t.website && <> · <a href={t.website.startsWith("http") ? t.website : `https://${t.website}`} target="_blank" rel="noopener noreferrer" className="underline">builder site</a></>}
                {t.draftId && <> · <Link href={`/admin/approval-queue/${t.draftId}`} className="underline">draft</Link></>}</div>
              <select name="status" defaultValue={t.status} className="input-dark text-xs py-1 px-2">{["open", "sent", "received", "declined", "done"].map((s) => <option key={s}>{s}</option>)}</select>
              <input name="notes" defaultValue={t.notes ?? ""} className="input-dark text-xs py-1 px-2 w-64" />
              <button className="text-xs underline text-[#7A5C1A]">Save</button>
            </form>
          ))}
          {tasks.length === 0 && <p className="text-xs text-gray-400">No open tasks.</p>}
        </div>
      </section>
    </div>
  );
}
