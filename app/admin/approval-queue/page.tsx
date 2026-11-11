import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireMasterPage } from "@/lib/adminGuard";
import { normaliseChecklist } from "@/lib/listings/checklist";
import { bulkEligible, BULK_MIN_CONFIDENCE } from "@/lib/listings/drafts";
import { FEATURES } from "@/lib/features";
import { CATEGORIES } from "@/lib/research/rules";
import { QuickAddForm, VentureForm } from "./forms";
import { bulkPublishAction } from "./actions";

export const dynamic = "force-dynamic";

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const STATUSES = ["draft", "approved", "rejected"] as const;
const ORIGINS: [string, string][] = [["", "All sources"], ["research", "Listing Researcher"], ["recheck", "Re-checks"], ["project_check", "Project checks"], ["venture", "My ventures"], ["broker_csv", "Brokers"], ["quick_add_url", "Quick Add (link)"], ["quick_add_text", "Quick Add (text)"]];

type SP = { status?: string; origin?: string; category?: string; city?: string; minConf?: string; flag?: string };

export default async function ApprovalQueuePage({ searchParams }: { searchParams: SP }) {
  await requireMasterPage();
  const status = STATUSES.includes(searchParams.status as (typeof STATUSES)[number]) ? searchParams.status! : "draft";
  const minConf = Number(searchParams.minConf) || 0;
  const where: Prisma.ListingDraftWhereInput = {
    reviewStatus: status,
    ...(searchParams.origin ? { origin: searchParams.origin } : {}),
    ...(searchParams.category ? { category: searchParams.category } : {}),
    ...(searchParams.city ? { city: { contains: searchParams.city, mode: "insensitive" } } : {}),
    ...(minConf ? { confidence: { gte: minConf } } : {}),
  };

  let drafts: Awaited<ReturnType<typeof prisma.listingDraft.findMany>> = [];
  let missing = false;
  try {
    drafts = await prisma.listingDraft.findMany({ where, orderBy: [{ confidence: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }], take: 150 });
  } catch { missing = true; }
  const flagged = (d: (typeof drafts)[number]) => { const c = (d.checks ?? {}) as { conflicts?: string[]; duplicateOf?: string | null; missing?: string[] }; return { conflicts: c.conflicts?.length ?? 0, dup: !!c.duplicateOf, missing: c.missing ?? [] }; };
  if (searchParams.flag === "conflict") drafts = drafts.filter((d) => flagged(d).conflicts > 0);
  if (searchParams.flag === "duplicate") drafts = drafts.filter((d) => flagged(d).dup);
  const eligible = drafts.filter(bulkEligible);
  const qs = (patch: Partial<SP>) => "?" + new URLSearchParams(Object.entries({ ...searchParams, status, ...patch }).filter(([, v]) => v) as [string, string][]).toString();
  const sel = "input-dark text-xs py-1.5 px-2";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/admin/automation" className="text-xs text-gray-400 underline">← Automation</Link>
      <h1 className="heading-h3 mt-2">Approval Queue</h1>
      <p className="text-gray-500 text-sm mb-5">Drafted listings wait here. Each needs all 10 checklist items ticked by you before it can go live on /buy with the Verified badge. Nothing is published automatically.</p>
      {missing && <p className="mb-4 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">The listing_drafts table isn&apos;t up to date: run the pending database update first.</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="flex gap-2 mb-3">
            {STATUSES.map((s) => (
              <Link key={s} href={qs({ status: s })} className={`text-xs px-3 py-1 rounded-full border capitalize ${s === status ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-600"}`}>{s}</Link>
            ))}
          </div>
          <form className="flex flex-wrap gap-2 mb-3 items-center">
            <input type="hidden" name="status" value={status} />
            <select name="origin" defaultValue={searchParams.origin ?? ""} className={sel}>{ORIGINS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <select name="category" defaultValue={searchParams.category ?? ""} className={sel}><option value="">All types</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
            <input name="city" defaultValue={searchParams.city ?? ""} placeholder="City" className={`${sel} w-28`} />
            <select name="minConf" defaultValue={searchParams.minConf ?? ""} className={sel}><option value="">Any confidence</option><option value="50">50+</option><option value="75">75+ (high)</option></select>
            <select name="flag" defaultValue={searchParams.flag ?? ""} className={sel}><option value="">Any flags</option><option value="conflict">Has conflicts</option><option value="duplicate">Possible duplicate</option></select>
            <button className="text-xs underline">Filter</button>
          </form>
          {FEATURES.listingResearcher && status === "draft" && (
            <form action={bulkPublishAction} className="mb-3 border border-gray-200 rounded-lg bg-white p-3 text-xs flex flex-wrap items-center gap-3">
              {eligible.map((d) => <input key={d.id} type="hidden" name="ids" value={d.id} />)}
              <span className="flex-1 min-w-[240px] text-gray-600"><b>{eligible.length}</b> researched draft{eligible.length === 1 ? "" : "s"} here {eligible.length === 1 ? "is" : "are"} high confidence ({BULK_MIN_CONFIDENCE}+), with no conflicts and no duplicates. Bulk approve publishes them <b>without</b> the Verified badge (&quot;not yet verified&quot; / &quot;Approval details pending&quot;) until you complete each checklist.</span>
              <button disabled={!eligible.length} className="btn-secondary text-xs disabled:opacity-40">Bulk approve {eligible.length}</button>
            </form>
          )}
          <div className="space-y-2">
            {drafts.length === 0 && <p className="text-sm text-gray-400">Nothing {status === "draft" ? "waiting for review" : status} with these filters.</p>}
            {drafts.map((d) => {
              const ticks = normaliseChecklist(d.checklist).filter(Boolean).length;
              const check = (d.aiPriceCheck ?? {}) as { status?: string; verdict?: string };
              const fl = flagged(d), rc = (d.checks ?? {}) as { priceVsArea?: string };
              return (
                <Link key={d.id} href={`/admin/approval-queue/${d.id}`} className="card-dark p-3 flex items-center justify-between gap-3 hover:border-gray-400">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{d.projectName}{d.origin === "recheck" && <span className="ml-2 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded px-1">RE-CHECK: changes</span>}</p>
                    <p className="text-xs text-gray-500 truncate">{[d.location, d.city].filter(Boolean).join(", ") || "No location"} · {d.reraNumber ? `RERA ${d.reraNumber}` : d.approvalNumber ? `${d.approvalAuthority} ${d.approvalNumber}` : "no approval no."} · {d.category ?? d.propertyType} · {d.sourceName ?? d.origin} · {day(d.createdAt)}</p>
                    {(fl.conflicts > 0 || fl.dup || fl.missing.length > 0) && <p className="text-[11px] text-amber-800 truncate">{[fl.conflicts ? `${fl.conflicts} conflict(s)` : null, fl.dup ? "possible duplicate" : null, fl.missing.length ? `missing: ${fl.missing.join(", ")}` : null].filter(Boolean).join(" · ")}</p>}
                  </div>
                  <div className="text-right shrink-0 text-xs">
                    {d.confidence != null && <p className={`font-semibold ${d.confidence >= BULK_MIN_CONFIDENCE ? "text-green-700" : d.confidence >= 50 ? "text-amber-700" : "text-red-700"}`}>{d.confidence}/100</p>}
                    <p className="tabular-nums">{ticks}/10 ✓</p>
                    <p className="text-gray-400">{rc.priceVsArea ? `price vs area: ${rc.priceVsArea.replace("_", " ")}` : check.status === "done" ? `price: ${check.verdict}` : check.status === "skipped" ? "no price check" : check.status ?? ""}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
        {!missing && <div className="space-y-4"><VentureForm /><QuickAddForm /></div>}
      </div>
    </div>
  );
}
