"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, AlertTriangle, CalendarClock, Mail, MessageCircle, Send, Loader2, CheckCircle2 } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";

interface Lead {
  id: string; name: string; phone: string; email: string | null; status: string; followUpDate: string | null;
}

// Follow-Up Management (Section 4). Reuses GET /api/leads (already fetches all leads, same as
// the Kanban dashboard) and groups client-side by followUpDate -- no new listing endpoint
// needed. Email reminders are genuinely live (Resend). WhatsApp/SMS call the real Twilio route;
// if not configured yet, the honest "not connected" result comes back and is shown as-is.
export default function FollowUpsPage() {
  const [leads, setLeads]     = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null); // `${leadId}:${channel}`
  const [results, setResults] = useState<Record<string, { ok: boolean; error?: string }>>({});

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/leads");
    if (r.ok) setLeads(await r.json() as Lead[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const { overdue, today, upcoming } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const withFollowUp = leads.filter(l => l.followUpDate && !["won", "lost"].includes(l.status));
    return {
      overdue:  withFollowUp.filter(l => new Date(l.followUpDate!) < startOfToday),
      today:    withFollowUp.filter(l => { const d = new Date(l.followUpDate!); return d >= startOfToday && d < endOfToday; }),
      upcoming: withFollowUp.filter(l => new Date(l.followUpDate!) >= endOfToday)
        .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime()),
    };
  }, [leads]);

  const remind = async (leadId: string, channel: "email" | "whatsapp" | "sms") => {
    const key = `${leadId}:${channel}`;
    setSending(key);
    try {
      const r = await fetch("/api/crm/followups/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, channel }),
      });
      const d = await r.json() as { ok: boolean; error?: string };
      setResults(prev => ({ ...prev, [key]: d }));
    } catch (e) {
      setResults(prev => ({ ...prev, [key]: { ok: false, error: e instanceof Error ? e.message : "Failed" } }));
    }
    setSending(null);
  };

  const ReminderRow = ({ lead }: { lead: Lead }) => (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
      <div className="flex-1 min-w-0">
        <Link href={`/crm/leads/${lead.id}`} className="text-white text-sm font-medium hover:underline">{lead.name}</Link>
        <p className="text-zinc-500 text-xs">{lead.phone}{lead.email ? ` · ${lead.email}` : ""}</p>
      </div>
      <span className="text-zinc-500 text-xs shrink-0">
        {lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => remind(lead.id, "email")} disabled={sending === `${lead.id}:email` || !lead.email}
          title={lead.email ? "Send email reminder" : "No email on file"}
          className="p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-[#D6A63E] disabled:opacity-30">
          {sending === `${lead.id}:email` ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
        </button>
        <button onClick={() => remind(lead.id, "whatsapp")} disabled={sending === `${lead.id}:whatsapp`}
          title="Send WhatsApp reminder (requires Twilio connection)"
          className="p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-[#D6A63E] disabled:opacity-30">
          {sending === `${lead.id}:whatsapp` ? <Loader2 size={13} className="animate-spin" /> : <MessageCircle size={13} />}
        </button>
        <button onClick={() => remind(lead.id, "sms")} disabled={sending === `${lead.id}:sms`}
          title="Send SMS reminder (requires Twilio connection)"
          className="p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-[#D6A63E] disabled:opacity-30">
          {sending === `${lead.id}:sms` ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        </button>
      </div>
      {(["email", "whatsapp", "sms"] as const).map(ch => {
        const res = results[`${lead.id}:${ch}`];
        if (!res) return null;
        return (
          <span key={ch} className={`text-[10px] ${res.ok ? "text-green-400" : "text-amber-400"}`}>
            {res.ok ? <CheckCircle2 size={11} className="inline" /> : (res.error === "not_configured" ? "Not connected" : res.error)}
          </span>
        );
      })}
    </div>
  );

  const Section = ({ title, icon, items, tone }: { title: string; icon: React.ReactNode; items: Lead[]; tone: string }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-5">
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        {icon}
        <h2 className="text-white font-semibold text-sm">{title}</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tone}`}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-zinc-600 text-sm px-4 py-6 text-center">Nothing here.</p>
      ) : (
        items.map(l => <ReminderRow key={l.id} lead={l} />)
      )}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--navy)" }}>
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/crm/dashboard" className="text-zinc-400 hover:text-white"><ArrowLeft size={18} /></Link>
          <PKLogo dark />
        </div>
        <h1 className="font-playfair text-white text-xl font-bold mb-1">Follow-Up Management</h1>
        <p className="text-zinc-400 text-sm mb-6">Email reminders are live. WhatsApp/SMS activate automatically once Twilio is connected in Settings → Integrations.</p>

        {loading ? (
          <p className="text-zinc-500 text-sm">Loading…</p>
        ) : (
          <>
            <Section title="Missed / Overdue" icon={<AlertTriangle size={16} className="text-red-400" />} items={overdue} tone="bg-red-900/40 text-red-300" />
            <Section title="Today" icon={<Clock size={16} style={{ color: "var(--gold)" }} />} items={today} tone="bg-amber-900/40 text-amber-300" />
            <Section title="Upcoming" icon={<CalendarClock size={16} className="text-zinc-400" />} items={upcoming} tone="bg-zinc-800 text-zinc-300" />
          </>
        )}
      </div>
    </div>
  );
}
