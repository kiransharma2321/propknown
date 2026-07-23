"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, Megaphone } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";

interface Campaign { id: string; name: string; channel: string; spend: number | null; active: boolean; createdAt: string }

// Marketing (Section 10 / K) -- real campaign records with manually-entered spend, feeding the
// Dashboard's real cost-per-lead calculation. Not a landing-page builder or automated ad spend
// tracker -- spend is entered here by hand and that's the only number ever used.
export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm] = useState({ name: "", channel: "meta", spend: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const r = await fetch("/api/admin/settings/campaigns");
    if (r.ok) setCampaigns((await r.json() as { campaigns: Campaign[] }).campaigns);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name) return;
    setSaving(true);
    await fetch("/api/admin/settings/campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, channel: form.channel, spend: form.spend ? Number(form.spend) : undefined }),
    });
    setForm({ name: "", channel: "meta", spend: "" });
    setShowForm(false);
    setSaving(false);
    await load();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/crm/dashboard-v2" className="text-gray-400 hover:text-gray-900"><ArrowLeft size={18} /></Link>
            <PKLogo />
          </div>
          <button onClick={() => setShowForm(s => !s)} className="btn-primary text-sm px-4 py-2">
            {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? "Cancel" : "New Campaign"}
          </button>
        </div>
        <h1 className="font-playfair text-gray-900 text-xl font-bold mb-1">Marketing Campaigns</h1>
        <p className="text-gray-500 text-sm mb-6">Enter real spend here to see real cost-per-lead on the Executive Dashboard.</p>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 space-y-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Campaign name" className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg px-3 py-2" />
            <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg px-3 py-2">
              <option value="meta">Meta (Facebook/Instagram)</option>
              <option value="google_ads">Google Ads</option>
              <option value="youtube">YouTube</option>
              <option value="other">Other</option>
            </select>
            <input type="number" value={form.spend} onChange={e => setForm(f => ({ ...f, spend: e.target.value }))} placeholder="Spend so far (₹, optional)" className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg px-3 py-2" />
            <p className="text-gray-400 text-[11px]">Note: the channel name here should match a lead source string (e.g. &quot;meta&quot;) to attribute leads correctly for cost-per-lead.</p>
            <button onClick={create} disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">{saving ? "Creating…" : "Create Campaign"}</button>
          </div>
        )}

        {loading ? <p className="text-gray-500 text-sm">Loading…</p> : campaigns.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">No campaigns yet — the Dashboard&apos;s Marketing ROI will stay empty until one exists with spend entered.</p>
        ) : (
          <div className="space-y-2">
            {campaigns.map(c => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone size={14} style={{ color: "var(--gold)" }} />
                  <div><p className="text-gray-900 text-sm">{c.name}</p><p className="text-gray-500 text-xs">{c.channel}</p></div>
                </div>
                <span className="text-gray-700 text-sm">{c.spend != null ? `₹${c.spend.toLocaleString("en-IN")}` : "No spend entered"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
