import { prisma } from "@/lib/db";
import { ALL_LOCALITIES } from "@/lib/localities";

export const dynamic = "force-dynamic";

const TOOL_LABEL: Record<string, string> = {
  price_check: "Price Check", ai_intel: "AI Intelligence", ai_intel_overview: "AI Intel (all types)",
  legal_shield: "Legal Shield", rera: "RERA", chat: "KnownAI Chat", voice: "Voice Agent",
  seo_page: "/prices refresh", cron_refresh: "Cron refresh", listing_check: "Listing check",
  crm_score: "CRM score", property_insight: "Listing page insight",
};

// Visitor-initiated tools only -- cron refreshes and admin scoring aren't demand signals.
const DEMAND_TOOLS = ["price_check", "ai_intel", "ai_intel_overview", "legal_shield", "rera", "chat", "voice", "listing_check"];

function prettyKey(key: string | null, fallback: string | null): string {
  if (!key) return fallback ?? "—";
  const [city, slug] = key.split("/");
  const loc = ALL_LOCALITIES.find((l) => l.citySlug === city && l.slug === slug);
  if (loc) return `${loc.name}, ${loc.city}`;
  return fallback ?? slug?.replace(/-/g, " ") ?? key;
}

export default async function AiDemandPage({ searchParams }: { searchParams: { days?: string } }) {
  const days = [7, 30, 90].includes(Number(searchParams.days)) ? Number(searchParams.days) : 30;
  const since = new Date(Date.now() - days * 86_400_000);
  const where = { createdAt: { gte: since }, tool: { in: DEMAND_TOOLS } };

  const [total, byLocality, byTool, byResult, byType, recent] = await Promise.all([
    prisma.aiQuery.count({ where }),
    prisma.aiQuery.groupBy({ by: ["locationKey"], where: { ...where, locationKey: { not: null } }, _count: { _all: true }, orderBy: { _count: { locationKey: "desc" } }, take: 20 }),
    prisma.aiQuery.groupBy({ by: ["tool"], where, _count: { _all: true } }),
    prisma.aiQuery.groupBy({ by: ["result"], where, _count: { _all: true } }),
    prisma.aiQuery.groupBy({ by: ["propertyType"], where: { ...where, propertyType: { not: null } }, _count: { _all: true } }),
    prisma.aiQuery.findMany({ where, orderBy: { createdAt: "desc" }, take: 40 }),
  ]);

  // One sample of what visitors actually typed per key, for free-text (non-config) locations.
  const samples = await prisma.aiQuery.findMany({
    where: { locationKey: { in: byLocality.map((b) => b.locationKey!).filter(Boolean) } },
    distinct: ["locationKey"], select: { locationKey: true, location: true },
  });
  const sampleOf = new Map(samples.map((s) => [s.locationKey, s.location]));
  const max = byLocality[0]?._count._all ?? 1;
  const ok = byResult.find((r) => r.result === "ok")?._count._all ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="heading-h3">AI Demand</h1>
          <p className="text-gray-500 text-sm">What visitors ask the AI tools about — every query is logged (location, type, result, time).</p>
        </div>
        <div className="flex gap-1.5">
          {[7, 30, 90].map((d) => (
            <a key={d} href={`?days=${d}`} className={`text-xs px-3 py-1.5 rounded-full border ${d === days ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 text-gray-600"}`}>{d} days</a>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="AI queries" value={total} />
        <Stat label="Answered with live data" value={total ? `${Math.round((ok / total) * 100)}%` : "—"} />
        <Stat label="Localities searched" value={byLocality.length >= 20 ? "20+" : byLocality.length} />
        <Stat label="Unavailable / timeout" value={total - ok} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 card-dark p-5">
          <h2 className="font-semibold text-sm mb-4">Top searched localities</h2>
          {byLocality.length === 0 ? <p className="text-gray-400 text-sm">No queries in this period yet.</p> : (
            <ol className="space-y-2">
              {byLocality.map((b, i) => (
                <li key={b.locationKey} className="text-sm">
                  <div className="flex justify-between gap-3 mb-1">
                    <span className="text-gray-800 truncate">{i + 1}. {prettyKey(b.locationKey, sampleOf.get(b.locationKey) ?? null)}</span>
                    <span className="text-gray-500 tabular-nums shrink-0">{b._count._all}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100"><div className="h-1.5 rounded-full" style={{ width: `${(b._count._all / max) * 100}%`, background: "var(--gold)" }} /></div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="space-y-5">
          <Breakdown title="By tool" rows={byTool.map((t) => [TOOL_LABEL[t.tool] ?? t.tool, t._count._all])} />
          <Breakdown title="By property type" rows={byType.map((t) => [t.propertyType ?? "—", t._count._all])} />
          <Breakdown title="By result" rows={byResult.map((t) => [t.result, t._count._all])} />
        </section>
      </div>

      <section className="card-dark p-5 mt-5 overflow-x-auto">
        <h2 className="font-semibold text-sm mb-3">Latest queries</h2>
        <table className="w-full text-xs min-w-[560px]">
          <thead><tr className="text-left text-gray-400"><th className="py-1.5">When</th><th>Tool</th><th>Location</th><th>Type</th><th>Result</th><th className="text-right">Price</th></tr></thead>
          <tbody>
            {recent.map((q) => (
              <tr key={q.id} className="border-t border-gray-100">
                <td className="py-1.5 text-gray-500 whitespace-nowrap">{q.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" })}</td>
                <td>{TOOL_LABEL[q.tool] ?? q.tool}</td>
                <td className="max-w-[200px] truncate">{q.location ?? "—"}</td>
                <td>{q.propertyType ?? "—"}</td>
                <td className={q.result === "ok" ? "text-green-700" : "text-amber-700"}>{q.result}{q.cached ? " (cache)" : ""}</td>
                <td className="text-right tabular-nums">{q.pricePerUnit ? `${q.currency ?? ""} ${Math.round(q.pricePerUnit).toLocaleString("en-IN")}/${q.unit ?? ""}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card-dark p-4">
      <p className="text-[11px] uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div className="card-dark p-5">
      <h2 className="font-semibold text-sm mb-3">{title}</h2>
      {rows.length === 0 ? <p className="text-gray-400 text-xs">—</p> : (
        <ul className="space-y-1 text-sm">
          {rows.sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <li key={k} className="flex justify-between"><span className="text-gray-700">{k}</span><span className="text-gray-500 tabular-nums">{v}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}
