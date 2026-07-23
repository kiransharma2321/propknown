"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Users, Flame, Clock, AlertTriangle, MapPin, Home,
  TrendingUp, Award, Megaphone, Activity, Sparkles, Loader2, LayoutDashboard, Handshake,
} from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";

interface DashboardStats {
  todaysLeads: number; totalLeads: number; wonLeads: number; conversionPct: number | null;
  followUpsToday: number; pendingFollowUps: number;
  todaysSiteVisits: number; totalBookings: number;
  leadSources: { source: string; count: number }[];
  leadTemperature: { hot: number; warm: number; cold: number; unscored: number };
  topExecutives: { name: string; total: number; won: number; value: number }[];
  campaignRoi: { name: string; channel: string; spend: number | null; leads: number; cpl: number | null }[];
  recentActivity: { id: string; name: string; status: string; source: string; updatedAt: string }[];
}

// Executive Dashboard (Section 1). Every card either shows a real number from
// /api/crm/dashboard-stats or an explicit empty state -- there is no card on this page that
// can display a fabricated figure, because the API route itself never invents one.
export default function ExecutiveDashboardPage() {
  const [stats, setStats]     = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights]           = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/crm/dashboard-stats");
      if (r.ok) setStats(await r.json() as DashboardStats);
      setLoading(false);
    })();
  }, []);

  const generateInsights = async () => {
    if (!stats) return;
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const r = await fetch("/api/crm/dashboard-stats/insights", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(stats),
      });
      const d = await r.json() as { insights?: string; error?: string };
      if (d.insights) setInsights(d.insights); else setInsightsError(d.error ?? "Unavailable");
    } catch (e) {
      setInsightsError(e instanceof Error ? e.message : "Request failed");
    }
    setInsightsLoading(false);
  };

  const Kpi = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) => (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2 text-gray-500">{icon}<span className="text-xs">{label}</span></div>
      <p className="text-gray-900 text-2xl font-bold">{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );

  const EmptyState = ({ text }: { text: string }) => <p className="text-gray-400 text-sm text-center py-6">{text}</p>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/crm/dashboard" className="text-gray-400 hover:text-gray-900"><ArrowLeft size={18} /></Link>
            <PKLogo />
          </div>
          <Link href="/crm/dashboard" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5">
            <LayoutDashboard size={13} /> Lead Pipeline
          </Link>
        </div>

        <h1 className="font-playfair text-gray-900 text-xl font-bold mb-1">Executive Dashboard</h1>
        <p className="text-gray-500 text-sm mb-4">Real-time, real data only — anything without underlying data shows an honest empty state.</p>

        <div className="flex flex-wrap gap-2 mb-6">
          <Link href="/crm/site-visits" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:text-gray-900 hover:border-[#D6A63E]"><MapPin size={12} /> Site Visits</Link>
          <Link href="/crm/bookings" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:text-gray-900 hover:border-[#D6A63E]"><Home size={12} /> Bookings</Link>
          <Link href="/crm/partners" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:text-gray-900 hover:border-[#D6A63E]"><Handshake size={12} /> Channel Partners</Link>
          <Link href="/crm/campaigns" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:text-gray-900 hover:border-[#D6A63E]"><Megaphone size={12} /> Campaigns</Link>
        </div>

        {loading || !stats ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : (
          <>
            {/* Top KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Kpi icon={<Users size={14} />} label="Today's Leads" value={stats.todaysLeads} />
              <Kpi icon={<Clock size={14} />} label="Follow-ups Today" value={stats.followUpsToday} />
              <Kpi icon={<AlertTriangle size={14} />} label="Pending Follow-ups" value={stats.pendingFollowUps} />
              <Kpi icon={<TrendingUp size={14} />} label="Conversion %" value={stats.conversionPct != null ? `${stats.conversionPct}%` : "—"} sub={stats.totalLeads > 0 ? `${stats.wonLeads} won of ${stats.totalLeads}` : undefined} />
              <Kpi icon={<MapPin size={14} />} label="Today's Site Visits" value={stats.todaysSiteVisits} sub={stats.todaysSiteVisits === 0 ? "No visits scheduled today" : undefined} />
              <Kpi icon={<Home size={14} />} label="Bookings" value={stats.totalBookings} sub={stats.totalBookings === 0 ? "No bookings recorded yet" : undefined} />
              <Kpi icon={<Flame size={14} />} label="Hot Leads" value={stats.leadTemperature.hot} sub={`${stats.leadTemperature.unscored} not yet AI-scored`} />
              <Kpi icon={<Users size={14} />} label="Total Leads" value={stats.totalLeads} />
            </div>

            <div className="grid md:grid-cols-2 gap-5 mb-6">
              {/* Lead Sources */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h2 className="text-gray-900 font-semibold text-sm mb-3">Lead Sources</h2>
                {stats.leadSources.length === 0 ? <EmptyState text="No leads recorded yet." /> : (
                  <div className="space-y-2">
                    {stats.leadSources.map(s => (
                      <div key={s.source} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{s.source}</span>
                        <span className="text-gray-900 font-semibold">{s.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Sales Executives / Employee Performance */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3"><Award size={14} style={{ color: "var(--gold)" }} /><h2 className="text-gray-900 font-semibold text-sm">Top Sales Executives</h2></div>
                {stats.topExecutives.length === 0 ? <EmptyState text="No leads have been assigned to anyone yet." /> : (
                  <div className="space-y-2">
                    {stats.topExecutives.map(e => (
                      <div key={e.name} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{e.name}</span>
                        <span className="text-gray-500">{e.won} won / {e.total} leads</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Marketing ROI */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-3"><Megaphone size={14} style={{ color: "var(--gold)" }} /><h2 className="text-gray-900 font-semibold text-sm">Marketing ROI</h2></div>
              {stats.campaignRoi.length === 0 ? (
                <EmptyState text="No campaigns with spend entered yet — add one in Settings to see real cost-per-lead here." />
              ) : (
                <div className="space-y-2">
                  {stats.campaignRoi.map(c => (
                    <div key={c.name} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{c.name} ({c.channel})</span>
                      <span className="text-gray-500">{c.leads} leads · {c.cpl != null ? `₹${c.cpl}/lead` : "no leads attributed yet"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-3"><Activity size={14} style={{ color: "var(--gold)" }} /><h2 className="text-gray-900 font-semibold text-sm">Recent Activity</h2></div>
              {stats.recentActivity.length === 0 ? <EmptyState text="No activity yet." /> : (
                <div className="space-y-2">
                  {stats.recentActivity.map(l => (
                    <Link key={l.id} href={`/crm/leads/${l.id}`} className="flex items-center justify-between text-sm hover:text-gray-900">
                      <span className="text-gray-700">{l.name} <span className="text-gray-400">via {l.source}</span></span>
                      <span className="text-gray-500 text-xs">{l.status} · {new Date(l.updatedAt).toLocaleDateString("en-IN")}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* AI Recommendations / Dashboard Insights */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><Sparkles size={14} style={{ color: "var(--gold)" }} /><h2 className="text-gray-900 font-semibold text-sm">AI Recommendations</h2></div>
                <button onClick={generateInsights} disabled={insightsLoading} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
                  {insightsLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} {insightsLoading ? "Analyzing…" : "Generate Insights"}
                </button>
              </div>
              {insights ? (
                <p className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">{insights}</p>
              ) : insightsError ? (
                <p className="text-amber-700 text-sm">{insightsError}</p>
              ) : (
                <EmptyState text="Click Generate Insights for an AI summary grounded in the real numbers above." />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
