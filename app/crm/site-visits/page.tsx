"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Plus, X, Star, ExternalLink } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";

interface SiteVisit {
  id: string; scheduledAt: string; status: string; assignedTo: string | null;
  feedback: string | null; rating: number | null; mapsLink: string | null;
  lead: { id: string; name: string; phone: string };
  property: { id: string; title: string } | null;
}
interface LeadOption { id: string; name: string }

// Site Visit Module (Section 6) -- schedule, assign, status, feedback + rating. No live GPS
// tracking (mapsLink is a plain Google Maps deep link) and no AI visit summary yet.
export default function SiteVisitsPage() {
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [leads, setLeads]   = useState<LeadOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leadId: "", scheduledAt: "", assignedTo: "", mapsLink: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [vr, lr] = await Promise.all([fetch("/api/crm/site-visits"), fetch("/api/leads")]);
    if (vr.ok) setVisits((await vr.json() as { siteVisits: SiteVisit[] }).siteVisits);
    if (lr.ok) setLeads((await lr.json() as LeadOption[]).map(l => ({ id: l.id, name: l.name })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const schedule = async () => {
    if (!form.leadId || !form.scheduledAt) return;
    setSaving(true);
    await fetch("/api/crm/site-visits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ leadId: "", scheduledAt: "", assignedTo: "", mapsLink: "" });
    setShowForm(false);
    setSaving(false);
    await load();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/crm/site-visits", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    await load();
  };

  const STATUS_COLORS: Record<string, string> = { scheduled: "bg-blue-900/40 text-blue-300", completed: "bg-green-900/40 text-green-300", cancelled: "bg-red-900/40 text-red-300", no_show: "bg-amber-900/40 text-amber-300" };

  return (
    <div className="min-h-screen" style={{ background: "var(--navy)" }}>
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/crm/dashboard" className="text-zinc-400 hover:text-white"><ArrowLeft size={18} /></Link>
            <PKLogo dark />
          </div>
          <button onClick={() => setShowForm(s => !s)} className="btn-primary text-sm px-4 py-2">
            {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? "Cancel" : "Schedule Visit"}
          </button>
        </div>
        <h1 className="font-playfair text-white text-xl font-bold mb-1">Site Visits</h1>
        <p className="text-zinc-400 text-sm mb-6">Schedule, assign, and track visit outcomes.</p>

        {showForm && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 space-y-3">
            <select value={form.leadId} onChange={e => setForm(f => ({ ...f, leadId: e.target.value }))} className="w-full bg-black/30 border border-white/10 text-white text-sm rounded-lg px-3 py-2">
              <option value="">Select lead…</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} className="w-full bg-black/30 border border-white/10 text-white text-sm rounded-lg px-3 py-2" />
            <input value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="Assign to (executive name)" className="w-full bg-black/30 border border-white/10 text-white text-sm rounded-lg px-3 py-2" />
            <input value={form.mapsLink} onChange={e => setForm(f => ({ ...f, mapsLink: e.target.value }))} placeholder="Google Maps link (optional)" className="w-full bg-black/30 border border-white/10 text-white text-sm rounded-lg px-3 py-2" />
            <button onClick={schedule} disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">{saving ? "Scheduling…" : "Schedule"}</button>
          </div>
        )}

        {loading ? <p className="text-zinc-500 text-sm">Loading…</p> : visits.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-10">No site visits scheduled yet.</p>
        ) : (
          <div className="space-y-3">
            {visits.map(v => (
              <div key={v.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white text-sm font-medium">{v.lead.name} {v.property && <span className="text-zinc-500">· {v.property.title}</span>}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[v.status] ?? "bg-white/10 text-zinc-300"}`}>{v.status.replace("_", " ")}</span>
                </div>
                <p className="text-zinc-500 text-xs flex items-center gap-3">
                  <span className="flex items-center gap-1"><MapPin size={11} /> {new Date(v.scheduledAt).toLocaleString("en-IN")}</span>
                  {v.assignedTo && <span>Assigned: {v.assignedTo}</span>}
                  {v.mapsLink && <a href={v.mapsLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white"><ExternalLink size={11} /> Maps</a>}
                </p>
                {v.rating && <p className="text-amber-400 text-xs mt-1 flex items-center gap-1"><Star size={11} /> {v.rating}/5{v.feedback && ` — ${v.feedback}`}</p>}
                {v.status === "scheduled" && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => updateStatus(v.id, "completed")} className="text-xs px-2.5 py-1 rounded-lg border border-white/10 text-zinc-300 hover:text-white">Mark Completed</button>
                    <button onClick={() => updateStatus(v.id, "cancelled")} className="text-xs px-2.5 py-1 rounded-lg border border-white/10 text-zinc-300 hover:text-white">Cancel</button>
                    <button onClick={() => updateStatus(v.id, "no_show")} className="text-xs px-2.5 py-1 rounded-lg border border-white/10 text-zinc-300 hover:text-white">No-show</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
