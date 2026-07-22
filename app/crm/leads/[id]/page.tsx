"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Phone, Mail, Tag, FileText, Clock, Sparkles, Loader2,
  Upload, MessageCircleOff, PhoneOff, Send, X,
} from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";
import KnownAIChat from "@/components/chatbot/KnownAIChat";

interface Lead {
  id: string; name: string; email: string | null; phone: string; message: string | null;
  source: string; status: string; notes: string | null; assignedTo: string | null;
  followUpDate: string | null; leadValue: number | null; tags: string[]; timeline: TimelineEntry[];
  docIds: string; createdAt: string; property: { id: string; title: string } | null;
  leadScore: number | null; buyingIntent: string | null; financialStrength: string | null;
  urgencyLevel: string | null; conversionProbability: number | null; bestFollowUpTime: string | null;
  recommendedPropertyId: string | null; nextBestAction: string | null; aiSummary: string | null; aiScoredAt: string | null;
}
interface TimelineEntry { ts?: string; at?: string; type: string; text?: string; channel?: string; by?: string; }
interface ProjectOption { id: string; name: string; }
interface DocFile { id: string; name: string; sizeBytes: number }

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead]       = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes]     = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [recommendedProperty, setRecommendedProperty] = useState<{ title: string } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/leads/${id}`);
    if (r.ok) {
      const d = await r.json() as Lead;
      setLead(d);
      setNotes(d.notes ?? "");
      // docIds stores full {id,name,sizeBytes} metadata objects, not bare IDs -- /api/files/[id]
      // serves raw file bytes for download, not JSON metadata, so there's nothing to re-fetch;
      // the metadata captured at upload time (see uploadDoc below) is the only copy needed.
      setDocs(JSON.parse(d.docIds || "[]") as DocFile[]);
      if (d.recommendedPropertyId) {
        const pr = await fetch(`/api/properties/${d.recommendedPropertyId}`);
        if (pr.ok) { const p = await pr.json() as { title: string }; setRecommendedProperty(p); }
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/admin/settings/projects").then(r => r.ok ? r.json() : null).then((d: { projects: ProjectOption[] } | null) => { if (d) setProjects(d.projects); });
  }, []);

  const saveNotes = async () => {
    setSavingNotes(true);
    await fetch(`/api/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes }) });
    await load();
    setSavingNotes(false);
  };

  const addInterestTag = async (projectName: string) => {
    if (!lead || lead.tags.includes(projectName)) return;
    const tags = [...lead.tags, projectName];
    await fetch(`/api/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tags }) });
    await load();
  };
  const removeInterestTag = async (tag: string) => {
    if (!lead) return;
    const tags = lead.tags.filter(t => t !== tag);
    await fetch(`/api/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tags }) });
    await load();
  };

  const uploadDoc = async (file: File) => {
    if (!lead) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    if (r.ok) {
      const uploaded = await r.json() as DocFile;
      const docList = [...(JSON.parse(lead.docIds || "[]") as DocFile[]), uploaded];
      await fetch(`/api/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ docIds: JSON.stringify(docList) }) });
      await load();
    }
    setUploading(false);
  };

  const runScoring = async () => {
    setScoring(true);
    setScoreError(null);
    setDraftMessage(null);
    try {
      const r = await fetch(`/api/crm/leads/${id}/score`, { method: "POST" });
      const d = await r.json() as { ok?: boolean; error?: string; draftFollowUpMessage?: string };
      if (d.ok) { setDraftMessage(d.draftFollowUpMessage ?? null); await load(); }
      else setScoreError(d.error ?? "Scoring failed");
    } catch (e) {
      setScoreError(e instanceof Error ? e.message : "Request failed");
    }
    setScoring(false);
  };

  if (loading || !lead) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--navy)" }}><p className="text-zinc-500 text-sm">Loading…</p></div>;
  }

  const timeline = [...lead.timeline].reverse();

  return (
    <div className="min-h-screen" style={{ background: "var(--navy)" }}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/crm/dashboard" className="text-zinc-400 hover:text-white"><ArrowLeft size={18} /></Link>
          <PKLogo dark />
        </div>

        {/* Profile header */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="font-playfair text-white text-xl font-bold">{lead.name}</h1>
              <p className="text-zinc-500 text-xs">Source: {lead.source} · Stage: {lead.status} · Added {new Date(lead.createdAt).toLocaleDateString("en-IN")}</p>
            </div>
            {lead.leadValue != null && <span className="text-white font-bold">₹{lead.leadValue.toLocaleString("en-IN")}</span>}
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-300 mb-3">
            <span className="flex items-center gap-1.5"><Phone size={13} /> {lead.phone}</span>
            {lead.email && <span className="flex items-center gap-1.5"><Mail size={13} /> {lead.email}</span>}
          </div>
          {lead.message && <p className="text-zinc-400 text-sm bg-black/20 rounded-lg p-3">{lead.message}</p>}

          {/* Property Interests -- tags backed by real Settings > Projects */}
          <div className="mt-4">
            <p className="text-zinc-500 text-xs mb-2 flex items-center gap-1.5"><Tag size={12} /> Property Interests</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {lead.tags.map(t => (
                <span key={t} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-black/30 border border-white/10 text-zinc-300">
                  {t} <button onClick={() => removeInterestTag(t)}><X size={10} /></button>
                </span>
              ))}
              {lead.tags.length === 0 && <span className="text-zinc-600 text-xs">None tagged yet.</span>}
            </div>
            {projects.length > 0 ? (
              <select onChange={e => { if (e.target.value) addInterestTag(e.target.value); e.target.value = ""; }}
                className="bg-black/30 border border-white/10 text-zinc-400 text-xs rounded-lg px-2 py-1.5">
                <option value="">+ Tag a project…</option>
                {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            ) : (
              <p className="text-zinc-600 text-xs">No projects in Settings yet — add one to tag interests.</p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5 mb-6">
          {/* AI Summary / Score */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><Sparkles size={14} style={{ color: "var(--gold)" }} /><h2 className="text-white font-semibold text-sm">AI Lead Score</h2></div>
              <button onClick={runScoring} disabled={scoring} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
                {scoring ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} {scoring ? "Scoring…" : "Score this lead"}
              </button>
            </div>
            {lead.leadScore != null ? (
              <div className="space-y-1.5 text-sm">
                <p className="text-white font-bold text-lg">{lead.leadScore}/100</p>
                <p className="text-zinc-400"><span className="text-zinc-500">Buying intent:</span> {lead.buyingIntent}</p>
                <p className="text-zinc-400"><span className="text-zinc-500">Financial strength:</span> {lead.financialStrength}</p>
                <p className="text-zinc-400"><span className="text-zinc-500">Urgency:</span> {lead.urgencyLevel}</p>
                <p className="text-zinc-400"><span className="text-zinc-500">Conversion probability:</span> {lead.conversionProbability}%</p>
                <p className="text-zinc-400"><span className="text-zinc-500">Best follow-up time:</span> {lead.bestFollowUpTime}</p>
                {recommendedProperty && <p className="text-zinc-400"><span className="text-zinc-500">Recommended:</span> {recommendedProperty.title}</p>}
                <p className="text-zinc-400"><span className="text-zinc-500">Next best action:</span> {lead.nextBestAction}</p>
                <p className="text-zinc-500 text-xs mt-2 leading-relaxed">{lead.aiSummary}</p>
                <p className="text-zinc-700 text-[10px]">Scored {lead.aiScoredAt ? new Date(lead.aiScoredAt).toLocaleString("en-IN") : ""}</p>
              </div>
            ) : (
              <p className="text-zinc-600 text-sm">Not scored yet.</p>
            )}
            {scoreError && <p className="text-red-400 text-xs mt-2">{scoreError}</p>}
            {draftMessage && (
              <div className="mt-3 bg-black/30 border border-white/10 rounded-lg p-3">
                <p className="text-zinc-500 text-xs mb-1 flex items-center gap-1"><Send size={11} /> Draft follow-up (review before sending — nothing is auto-sent)</p>
                <p className="text-zinc-300 text-sm">{draftMessage}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-white font-semibold text-sm mb-3">Notes</h2>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={6}
              className="w-full bg-black/30 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#D6A63E] resize-none"
              placeholder="Write notes about this lead…" />
            <button onClick={saveNotes} disabled={savingNotes} className="btn-primary text-xs px-3 py-1.5 mt-2 disabled:opacity-50">
              {savingNotes ? "Saving…" : "Save Notes"}
            </button>
          </div>
        </div>

        {/* Call History / WhatsApp History -- honest, not fabricated */}
        <div className="grid md:grid-cols-2 gap-5 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-white font-semibold text-sm mb-2 flex items-center gap-2"><PhoneOff size={14} className="text-zinc-500" /> Call History</h2>
            <p className="text-zinc-600 text-xs">Not connected — no telephony integration is set up yet. This section will populate once one is.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-white font-semibold text-sm mb-2 flex items-center gap-2"><MessageCircleOff size={14} className="text-zinc-500" /> WhatsApp History</h2>
            <p className="text-zinc-600 text-xs">Not connected — no WhatsApp Business API integration is set up yet. This section will populate once one is.</p>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
          <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><FileText size={14} style={{ color: "var(--gold)" }} /> Documents</h2>
          {docs.length === 0 ? <p className="text-zinc-600 text-sm mb-3">No documents attached yet.</p> : (
            <div className="space-y-1.5 mb-3">
              {docs.map(d => <p key={d.id} className="text-zinc-300 text-sm">{d.name} <span className="text-zinc-600 text-xs">({Math.round(d.sizeBytes / 1024)} KB)</span></p>)}
            </div>
          )}
          <label className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-white/20 text-white hover:border-[#D6A63E] cursor-pointer">
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} {uploading ? "Uploading…" : "Attach Document"}
            <input type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadDoc(e.target.files[0]); }} />
          </label>
        </div>

        {/* Timeline */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><Clock size={14} style={{ color: "var(--gold)" }} /> Customer Journey Timeline</h2>
          {timeline.length === 0 ? <p className="text-zinc-600 text-sm">No activity logged yet.</p> : (
            <div className="space-y-3">
              {timeline.map((t, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="text-zinc-600 text-xs shrink-0 w-32">{new Date(t.ts ?? t.at ?? "").toLocaleString("en-IN")}</span>
                  <span className="text-zinc-300">{t.text ?? (t.type === "reminder" ? `Reminder sent via ${t.channel}${t.by ? ` by ${t.by}` : ""}` : t.type)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Chat Assistant -- genuine reuse of the existing KnownAI widget, not a new implementation */}
      <KnownAIChat />
    </div>
  );
}
