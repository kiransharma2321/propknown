import { prisma } from "@/lib/db";
import { GEMINI_MODEL } from "@/lib/marketIntel";
import { quotas, utcDay, USAGE_WARN_RATIO, COST_PER_CALL_INR, type ApiProvider } from "@/lib/engine/usage";
import { ownEngineStatus } from "@/lib/ownEngine";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

type UsageRow = { day: string; provider: string; calls: number; errors: number; rateLimited: number };

export default async function EngineHealthPage() {
  const today = utcDay();
  const monthStart = today.slice(0, 8) + "01";
  const since = new Date(Date.now() - 86_400_000);

  // api_usage may not exist until the schema push has run -- show the page anyway.
  let usage: UsageRow[] = [];
  let usageError: string | null = null;
  try {
    usage = await prisma.apiUsage.findMany({ where: { day: { gte: monthStart } }, orderBy: { day: "desc" } });
  } catch {
    usageError = "Usage table not created yet: run the pending database update (prisma db push) to start tracking.";
  }

  const [queries24h, failed24h, cacheRows, oldest, newest] = await Promise.all([
    prisma.aiQuery.count({ where: { createdAt: { gte: since } } }),
    prisma.aiQuery.count({ where: { createdAt: { gte: since }, result: { not: "ok" } } }),
    prisma.locationMarketCache.count(),
    prisma.locationMarketCache.findFirst({ orderBy: { fetchedAt: "asc" }, select: { fetchedAt: true, locationName: true } }),
    prisma.locationMarketCache.findFirst({ orderBy: { fetchedAt: "desc" }, select: { fetchedAt: true, locationName: true } }),
  ]);

  const used = (provider: string, period: "day" | "month") =>
    usage.filter((u) => u.provider === provider && (period === "month" || u.day === today))
      .reduce((a, u) => ({ calls: a.calls + u.calls, errors: a.errors + u.errors, rateLimited: a.rateLimited + u.rateLimited }), { calls: 0, errors: 0, rateLimited: 0 });

  const rows = quotas().map((q) => {
    const u = used(q.provider, q.period);
    const ratio = q.limit > 0 ? u.calls / q.limit : 0;
    return { ...q, ...u, ratio, warn: ratio >= USAGE_WARN_RATIO };
  });
  const warnings = rows.filter((r) => r.warn);
  // Own Engine: free tiers only, so this month's cost is calls x 0. Shown so any paid call would stand out.
  const own = ownEngineStatus();
  const OWN: ApiProvider[] = ["gemini", "groq", "cerebras", "openrouter", "searxng", "tavily", "brave", "serper", "fetch"];
  const ownCalls = usage.filter((u) => OWN.includes(u.provider as ApiProvider)).reduce((a, u) => a + u.calls, 0);
  const ownCost = usage.reduce((a, u) => a + u.calls * (COST_PER_CALL_INR[u.provider as ApiProvider] ?? 0), 0);

  return (
    <div>
      <h1 className="heading-h3">Engine Health</h1>
      <p className="text-gray-500 text-sm mb-5">
        Outbound API usage for the AI price engine, against each provider&apos;s quota. A warning shows at {Math.round(USAGE_WARN_RATIO * 100)}% of a quota.
      </p>

      {usageError && <p className="mb-4 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">{usageError}</p>}
      {warnings.map((w) => (
        <p key={w.provider} className="mb-3 text-sm bg-red-50 border border-red-200 text-red-800 rounded-lg px-3 py-2">
          ⚠ {w.label} is at {Math.round(w.ratio * 100)}% of its {w.period === "day" ? "daily" : "monthly"} quota ({w.calls.toLocaleString()} / {w.limit.toLocaleString()}).
        </p>
      ))}

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        {rows.map((r) => (
          <div key={r.provider} className="card-dark p-4">
            <p className="text-[11px] uppercase tracking-wider text-gray-400">{r.label} · {r.period === "day" ? "today (UTC)" : "this month"}</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{r.calls.toLocaleString()} <span className="text-sm font-normal text-gray-400">/ {r.limit.toLocaleString()}</span></p>
            <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, r.ratio * 100)}%`, background: r.warn ? "#dc2626" : "#16a34a" }} />
            </div>
            <p className="text-xs text-gray-500 mt-2">{r.errors} errors · {r.rateLimited} quota-limited (429)</p>
            <p className="text-[11px] text-gray-400 mt-1">{r.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 mb-6">
        <div className="card-dark p-4 text-sm">
          <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">Configuration</p>
          <p>Model: <code>{GEMINI_MODEL}</code>{process.env.GEMINI_MODEL ? " (GEMINI_MODEL)" : " (default)"}</p>
          <p>Chain: grounded {GEMINI_MODEL} → grounded gemini-2.5-flash → ungrounded on web data → fresh cache (7 days) → last result, labelled &ldquo;Last updated&rdquo;</p>
          <p>Bayut: {process.env.BAYUT_ENABLED === "true" ? "on" : "off (RapidAPI bayut14 no longer exists)"}</p>
        </div>
        <div className="card-dark p-4 text-sm">
          <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">Last 24 hours</p>
          <p>{queries24h.toLocaleString()} price lookups, {failed24h.toLocaleString()} without a live answer ({queries24h ? Math.round((failed24h / queries24h) * 100) : 0}%)</p>
          <p>{cacheRows.toLocaleString()} cached area prices</p>
          {newest && <p>Newest: {newest.locationName}, {fmt(newest.fetchedAt)}</p>}
          {oldest && <p>Oldest: {oldest.locationName}, {fmt(oldest.fetchedAt)}</p>}
        </div>
      </div>

      <div className="card-dark p-4 text-sm mb-6">
        <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">PropKnown Own Engine (free tiers)</p>
        <p>Site uses: <b>{own.mode === "own" ? "Own Engine" : "current engine"}</b>{own.mode !== "own" && " (Own Engine on standby: switches only with ENGINE_MODE=own after owner approval)"}</p>
        <p>AI router: {own.ai.join(" → ") || "no free AI provider configured"} · Search: {own.search.join(" → ") || "none"} · Fetcher: own, robots.txt respected</p>
        <p>Cache plan: areas {own.ttl.area} days, projects {own.ttl.project} days</p>
        <p>This month: {ownCalls.toLocaleString()} calls · cost <b>₹{ownCost.toLocaleString("en-IN")}</b> (free tiers only)</p>
      </div>

      <h2 className="font-semibold text-gray-900 mb-2">Daily usage this month</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-400 text-xs"><th className="py-2 pr-4">Day (UTC)</th><th className="pr-4">Provider</th><th className="pr-4">Calls</th><th className="pr-4">Errors</th><th>429s</th></tr></thead>
          <tbody>
            {usage.length === 0 && <tr><td colSpan={5} className="py-3 text-gray-400">No usage recorded yet.</td></tr>}
            {usage.map((u) => (
              <tr key={`${u.day}-${u.provider}`} className="border-t border-gray-100">
                <td className="py-2 pr-4 tabular-nums">{u.day}</td><td className="pr-4">{u.provider}</td>
                <td className="pr-4 tabular-nums">{u.calls}</td><td className="pr-4 tabular-nums">{u.errors}</td><td className="tabular-nums">{u.rateLimited}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
