"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, Handshake } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";

interface Partner { id: string; name: string; phone: string; email: string | null; company: string | null; active: boolean; leadCount: number }

// Channel Partner Module (Section 9) -- registration + lead attribution/leaderboard-by-count.
// No commission/payout tracking yet -- real financial logic, deliberately excluded.
export default function ChannelPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", company: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const r = await fetch("/api/crm/channel-partners");
    if (r.ok) setPartners((await r.json() as { partners: Partner[] }).partners);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name || !form.phone) return;
    setSaving(true);
    await fetch("/api/crm/channel-partners", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ name: "", phone: "", email: "", company: "" });
    setShowForm(false);
    setSaving(false);
    await load();
  };

  const sorted = [...partners].sort((a, b) => b.leadCount - a.leadCount);

  return (
    <div className="min-h-screen" style={{ background: "var(--navy)" }}>
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/crm/dashboard" className="text-zinc-400 hover:text-white"><ArrowLeft size={18} /></Link>
            <PKLogo dark />
          </div>
          <button onClick={() => setShowForm(s => !s)} className="btn-primary text-sm px-4 py-2">
            {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? "Cancel" : "Register Partner"}
          </button>
        </div>
        <h1 className="font-playfair text-white text-xl font-bold mb-1">Channel Partners</h1>
        <p className="text-zinc-400 text-sm mb-6">Registration and lead attribution. Ranked by real lead count — no fabricated performance data.</p>

        {showForm && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 space-y-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Partner name" className="w-full bg-black/30 border border-white/10 text-white text-sm rounded-lg px-3 py-2" />
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone" className="w-full bg-black/30 border border-white/10 text-white text-sm rounded-lg px-3 py-2" />
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email (optional)" className="w-full bg-black/30 border border-white/10 text-white text-sm rounded-lg px-3 py-2" />
            <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Company (optional)" className="w-full bg-black/30 border border-white/10 text-white text-sm rounded-lg px-3 py-2" />
            <button onClick={create} disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">{saving ? "Registering…" : "Register"}</button>
          </div>
        )}

        {loading ? <p className="text-zinc-500 text-sm">Loading…</p> : sorted.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-10">No channel partners registered yet.</p>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {sorted.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
                <span className="text-zinc-500 text-xs w-5">{i + 1}</span>
                <Handshake size={14} style={{ color: "var(--gold)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">{p.name} {p.company && <span className="text-zinc-500">· {p.company}</span>}</p>
                  <p className="text-zinc-500 text-xs">{p.phone}{p.email ? ` · ${p.email}` : ""}</p>
                </div>
                <span className="text-white font-semibold text-sm">{p.leadCount}</span>
                <span className="text-zinc-600 text-xs">leads</span>
                {!p.active && <span className="text-xs text-zinc-600 bg-black/30 px-2 py-0.5 rounded-full">Inactive</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
