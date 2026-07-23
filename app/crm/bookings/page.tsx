"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, Home } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";

interface Booking {
  id: string; amount: number | null; status: string; createdAt: string;
  lead: { id: string; name: string; phone: string };
  property: { id: string; title: string } | null;
  timeline: { ts: string; text: string; by?: string }[];
}
interface LeadOption { id: string; name: string }

// Booking Module (Section 7) -- basic record + status/timeline. No agreement generation,
// cancellation, or refund workflow yet -- that's real financial logic, deliberately excluded.
export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [leads, setLeads]       = useState<LeadOption[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leadId: "", amount: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [br, lr] = await Promise.all([fetch("/api/crm/bookings"), fetch("/api/leads")]);
    if (br.ok) setBookings((await br.json() as { bookings: Booking[] }).bookings);
    if (lr.ok) setLeads((await lr.json() as LeadOption[]).map(l => ({ id: l.id, name: l.name })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.leadId) return;
    setSaving(true);
    await fetch("/api/crm/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: form.leadId, amount: form.amount ? Number(form.amount) : undefined }) });
    setForm({ leadId: "", amount: "" });
    setShowForm(false);
    setSaving(false);
    await load();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/crm/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    await load();
  };

  const STATUS_COLORS: Record<string, string> = { initiated: "bg-blue-900/40 text-blue-300", confirmed: "bg-green-900/40 text-green-300", cancelled: "bg-red-900/40 text-red-300" };

  return (
    <div className="min-h-screen" style={{ background: "var(--navy)" }}>
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/crm/dashboard" className="text-zinc-400 hover:text-white"><ArrowLeft size={18} /></Link>
            <PKLogo dark />
          </div>
          <button onClick={() => setShowForm(s => !s)} className="btn-primary text-sm px-4 py-2">
            {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? "Cancel" : "New Booking"}
          </button>
        </div>
        <h1 className="font-playfair text-white text-xl font-bold mb-1">Bookings</h1>
        <p className="text-zinc-400 text-sm mb-6">Basic booking records and status tracking.</p>

        {showForm && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 space-y-3">
            <select value={form.leadId} onChange={e => setForm(f => ({ ...f, leadId: e.target.value }))} className="w-full bg-black/30 border border-white/10 text-white text-sm rounded-lg px-3 py-2">
              <option value="">Select lead…</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="Booking amount (₹, optional)" className="w-full bg-black/30 border border-white/10 text-white text-sm rounded-lg px-3 py-2" />
            <button onClick={create} disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">{saving ? "Creating…" : "Create Booking"}</button>
          </div>
        )}

        {loading ? <p className="text-zinc-500 text-sm">Loading…</p> : bookings.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-10">No bookings recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => (
              <div key={b.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white text-sm font-medium flex items-center gap-1.5"><Home size={13} style={{ color: "var(--gold)" }} /> {b.lead.name} {b.property && <span className="text-zinc-500">· {b.property.title}</span>}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[b.status] ?? "bg-white/10 text-zinc-300"}`}>{b.status}</span>
                </div>
                {b.amount != null && <p className="text-zinc-400 text-xs">₹{b.amount.toLocaleString("en-IN")}</p>}
                <p className="text-zinc-600 text-xs mt-1">{new Date(b.createdAt).toLocaleDateString("en-IN")}</p>
                {b.status === "initiated" && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => updateStatus(b.id, "confirmed")} className="text-xs px-2.5 py-1 rounded-lg border border-white/10 text-zinc-300 hover:text-white">Confirm</button>
                    <button onClick={() => updateStatus(b.id, "cancelled")} className="text-xs px-2.5 py-1 rounded-lg border border-white/10 text-zinc-300 hover:text-white">Cancel</button>
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
