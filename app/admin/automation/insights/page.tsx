import Link from "next/link";
import { FEATURES } from "@/lib/features";
import { loadInsights, type Count } from "@/lib/insights";

export const dynamic = "force-dynamic";

// M11 dashboard (master only via the automation layout; feature flag NEXT_PUBLIC_FEATURE_BI).
// Counts from our own records only.
function Bars({ title, rows, empty = "No data in this period." }: { title: string; rows: Count[]; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white">
      <h2 className="font-semibold text-sm mb-3">{title}</h2>
      {rows.length === 0 ? <p className="text-xs text-gray-500">{empty}</p> : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.label} className="text-xs">
              <div className="flex justify-between gap-2"><span className="truncate">{r.label}</span><span className="font-semibold tabular-nums">{r.n}</span></div>
              <div className="h-1.5 rounded bg-gray-100"><div className="h-1.5 rounded" style={{ width: `${(r.n / max) * 100}%`, background: "#D6A63E" }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function InsightsPage({ searchParams }: { searchParams: { days?: string } }) {
  if (!FEATURES.bi) return <p className="text-sm text-gray-500">Business insights are switched off (feature flag NEXT_PUBLIC_FEATURE_BI).</p>;
  const days = [7, 30, 90, 365].includes(Number(searchParams.days)) ? Number(searchParams.days) : 30;
  const d = await loadInsights(days);
  const kpi = (label: string, v: number | string | null) => <div className="border border-gray-200 rounded-xl p-4 bg-white"><p className="text-xs text-gray-500">{label}</p><p className="font-playfair text-3xl">{v ?? "—"}</p></div>;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="heading-h3">Business Insights</h1><p className="text-sm text-gray-500">From our own records since {d.since.toLocaleDateString("en-IN")}. Nothing estimated.</p></div>
        <div className="flex gap-1 text-sm">{[7, 30, 90, 365].map((n) => <Link key={n} href={`?days=${n}`} className={`px-3 py-1.5 rounded-full border ${n === days ? "bg-[#0B1B33] text-white border-[#0B1B33]" : "border-gray-300"}`}>{n === 365 ? "1 year" : `${n} days`}</Link>)}</div>
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {kpi("Leads", d.leads.total)}{kpi("AI tool uses", d.ai.total)}{kpi("Active price watches", d.watches)}{kpi("Documents in vaults", d.docs)}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Bars title="Leads by week" rows={d.leads.byWeek} />
        <Bars title="Leads by source" rows={d.leads.bySource} />
        <Bars title="Lead status (funnel)" rows={d.leads.byStatus} />
        <Bars title="Leads by UTM source / campaign" rows={d.leads.byUtm} />
        <Bars title="AI tools used" rows={d.ai.byTool} />
        <Bars title="AI tool outcomes" rows={d.ai.byResult} />
        <Bars title="Most-searched locations" rows={d.ai.topLocations} />
        <Bars title="Emails (kind · status)" rows={d.emails} />
      </div>
      <div className="border border-gray-200 rounded-xl p-4 bg-white text-sm">
        <p className="font-semibold mb-1">Export</p>
        <p className="text-gray-500 text-xs mb-2">CSV of leads in this period (contains personal data; every export is recorded in the audit log).</p>
        <a href={`/api/admin/insights/export?days=${days}`} className="btn-primary text-sm inline-flex">Download leads CSV</a>
      </div>
    </div>
  );
}
