"use client";

import { useState, useEffect } from "react";
import { Phone, MessageSquare, Calendar, Trophy, X, Home, LogOut, Activity, LayoutDashboard, Search, IndianRupee, Clock, AlertCircle, Plus, Users, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { toIndianWaNumber } from "@/lib/phone";

type LeadStatus = "new" | "contacted" | "visit_booked" | "negotiation" | "won" | "lost";

interface TimelineEntry {
  ts: string;
  type: string;
  text: string;
}

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone: string;
  message?: string;
  source: string;
  status: LeadStatus;
  property?: { id: string; title: string } | null;
  notes?: string;
  followUpDate?: string | null;
  leadValue?: number | null;
  tags?: string[];
  timeline?: TimelineEntry[];
  createdAt: string;
}

const COLUMNS: { key: LeadStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "new",          label: "New",          icon: <MessageSquare size={14} />, color: "border-blue-500/40 bg-blue-950/20"    },
  { key: "contacted",    label: "Contacted",    icon: <Phone size={14} />,         color: "border-yellow-500/40 bg-yellow-950/20" },
  { key: "visit_booked", label: "Visit Booked", icon: <Calendar size={14} />,      color: "border-purple-500/40 bg-purple-950/20" },
  { key: "negotiation",  label: "Negotiation",  icon: <Activity size={14} />,      color: "border-orange-500/40 bg-orange-950/20" },
  { key: "won",          label: "Won",          icon: <Trophy size={14} />,         color: "border-green-500/40 bg-green-950/20"   },
  { key: "lost",         label: "Lost",         icon: <X size={14} />,             color: "border-red-500/40 bg-red-950/20"       },
];

const STATUS_COLORS: Record<LeadStatus, string> = {
  new:          "bg-blue-500",
  contacted:    "bg-yellow-500",
  visit_booked: "bg-purple-500",
  negotiation:  "bg-orange-500",
  won:          "bg-green-500",
  lost:         "bg-red-500",
};

const SOURCE_LABELS: Record<string, string> = {
  "homepage-cta":    "Homepage",
  contact:           "Contact Page",
  buy:               "Buy Page",
  sell:              "Sell Page",
  invest:            "Invest Page",
  "ai-intelligence": "AI Tool",
  chatbot:           "KnownAI Chat",
  brochure:          "Brochure",
  builders:          "Builders",
  webhook:           "Webhook",
  "meta-ads":        "Meta Ads",
  "google-ads":      "Google Ads",
  manual:            "Manual Entry",
};

function followUpStatus(dateStr?: string | null): "overdue" | "today" | "upcoming" | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const todayStr = now.toDateString();
  if (d.toDateString() === todayStr) return "today";
  if (d < now) return "overdue";
  return "upcoming";
}

function formatFollowUp(dateStr?: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function CRMDashboard() {
  const router = useRouter();
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedLead, setSelected] = useState<Lead | null>(null);
  const [noteInput, setNoteInput]   = useState("");
  const [dragId, setDragId]         = useState<string | null>(null);
  const [dragOver, setDragOver]     = useState<LeadStatus | null>(null);
  const [search, setSearch]         = useState("");
  const [filterSource, setFilter]   = useState("");
  const [editFollowUp, setFollowUp] = useState("");
  const [editValue, setEditValue]   = useState("");
  const [saving, setSaving]         = useState(false);
  const [view, setView]             = useState<"kanban" | "list">("kanban");

  // Add lead modal
  const [addOpen, setAddOpen]       = useState(false);
  const [addForm, setAddForm]       = useState({ name: "", phone: "", email: "", source: "manual", message: "" });
  const [addLoading, setAddLoading] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch { setLeads([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLeads(); }, []);

  const patchLead = async (id: string, data: Record<string, unknown>) => {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await fetchLeads();
    if (selectedLead?.id === id) {
      setSelected(l => l ? { ...l, ...data } : null);
    }
  };

  const moveStatus = (id: string, status: LeadStatus) => patchLead(id, { status });

  const handleDragStart = (id: string) => setDragId(id);
  const handleDragEnd   = () => { setDragId(null); setDragOver(null); };
  const handleDragOver  = (e: React.DragEvent, col: LeadStatus) => { e.preventDefault(); setDragOver(col); };
  const handleDrop      = (col: LeadStatus) => { if (dragId) moveStatus(dragId, col); setDragId(null); setDragOver(null); };

  const saveNote = async () => {
    if (!selectedLead || !noteInput.trim()) return;
    setSaving(true);
    await patchLead(selectedLead.id, { notes: noteInput });
    setNoteInput("");
    setSaving(false);
  };

  const saveFollowUp = async () => {
    if (!selectedLead) return;
    await patchLead(selectedLead.id, {
      followUpDate: editFollowUp || null,
      leadValue: editValue ? parseFloat(editValue) : null,
    });
  };

  const addLead = async () => {
    if (!addForm.name || !addForm.phone) return;
    setAddLoading(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      await fetchLeads();
      setAddOpen(false);
      setAddForm({ name: "", phone: "", email: "", source: "manual", message: "" });
    } catch { /* noop */ }
    setAddLoading(false);
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "crm" }) });
    router.push("/crm");
  };

  const openLead = (lead: Lead) => {
    setSelected(lead);
    setNoteInput("");
    setFollowUp(lead.followUpDate ? lead.followUpDate.split("T")[0] : "");
    setEditValue(lead.leadValue ? String(lead.leadValue) : "");
  };

  // Filtering
  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.name.toLowerCase().includes(q) || l.phone.includes(q) || (l.email ?? "").toLowerCase().includes(q);
    const matchSource = !filterSource || l.source === filterSource;
    return matchSearch && matchSource;
  });

  const byStatus = (status: LeadStatus) => filtered.filter(l => l.status === status);

  const pipelineValue = leads.filter(l => l.status !== "lost").reduce((s, l) => s + (l.leadValue ?? 0), 0);
  const wonValue      = leads.filter(l => l.status === "won").reduce((s, l) => s + (l.leadValue ?? 0), 0);
  const todayFollowUps = leads.filter(l => followUpStatus(l.followUpDate) === "today").length;
  const overdueCount   = leads.filter(l => followUpStatus(l.followUpDate) === "overdue").length;

  const allSources = Array.from(new Set(leads.map(l => l.source)));

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-black border-r border-zinc-800 flex flex-col shrink-0">
        <div className="p-5 border-b border-zinc-800">
          <span className="text-lg font-bold gold-text tracking-widest" style={{ fontFamily: "Georgia, serif" }}>PROPKNOWN</span>
          <p className="text-[9px] text-zinc-600 tracking-widest mt-0.5">CRM PORTAL</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white bg-zinc-800">
            <LayoutDashboard size={15} /> Lead Pipeline
          </button>
          <a href="/crm/contacts" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all">
            <Users size={15} /> Contacts
          </a>
          <a href="/crm/deals" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all">
            <TrendingUp size={15} /> Deals
          </a>
          <a href="/admin/dashboard" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all">
            <Home size={15} /> Admin
          </a>
        </nav>
        <div className="p-3 border-t border-zinc-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-red-400 transition-colors">
            <LogOut size={15} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-black border-b border-zinc-800 px-6 py-3 flex items-center gap-4 shrink-0 flex-wrap">
          <h1 className="text-white font-semibold mr-auto">Lead Pipeline</h1>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <span>Total: <span className="text-white font-bold">{leads.length}</span></span>
            <span className="text-green-400">Won: ₹{(wonValue / 1e5).toFixed(1)}L</span>
            <span className="text-yellow-400">Pipeline: ₹{(pipelineValue / 1e5).toFixed(1)}L</span>
            {todayFollowUps > 0 && <span className="text-blue-400"><Clock size={11} className="inline" /> {todayFollowUps} today</span>}
            {overdueCount > 0 && <span className="text-red-400"><AlertCircle size={11} className="inline" /> {overdueCount} overdue</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setView(v => v === "kanban" ? "list" : "kanban")}
              className="text-xs text-zinc-400 hover:text-white border border-zinc-700 rounded-lg px-3 py-1.5 hover:border-zinc-500 transition-all">
              {view === "kanban" ? "List View" : "Kanban"}
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-black"
              style={{ background: "#C9A24B" }}>
              <Plus size={13} /> Add Lead
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-zinc-950 border-b border-zinc-800 px-6 py-2.5 flex items-center gap-3 shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, phone, email..."
              className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-yellow-600 placeholder-zinc-600"
            />
          </div>
          <select
            value={filterSource}
            onChange={e => setFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-3 py-2 focus:outline-none">
            <option value="">All Sources</option>
            {allSources.map(s => <option key={s} value={s}>{SOURCE_LABELS[s] ?? s}</option>)}
          </select>
        </div>

        {/* Kanban or List */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-zinc-500">Loading leads...</div>
          ) : view === "kanban" ? (
            <div className="flex gap-4 min-w-max h-full">
              {COLUMNS.map((col) => {
                const colLeads = byStatus(col.key);
                const isOver   = dragOver === col.key;
                return (
                  <div key={col.key}
                    className={`w-64 rounded-xl border p-3 flex flex-col transition-all ${col.color} ${isOver ? "ring-2 ring-yellow-500/60 scale-[1.01]" : ""}`}
                    onDragOver={e => handleDragOver(e, col.key)}
                    onDrop={() => handleDrop(col.key)}>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2 text-zinc-300 text-sm font-semibold">
                        {col.icon} {col.label}
                      </div>
                      <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">{colLeads.length}</span>
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto min-h-[60px]">
                      {colLeads.length === 0 ? (
                        <div className={`text-xs text-center py-6 rounded-lg border border-dashed transition-colors ${isOver ? "border-yellow-500/40 text-yellow-600/60" : "border-zinc-800 text-zinc-700"}`}>
                          {isOver ? "Drop here" : "No leads"}
                        </div>
                      ) : colLeads.map(lead => {
                        const fuStatus = followUpStatus(lead.followUpDate);
                        return (
                          <div key={lead.id} draggable
                            onDragStart={() => handleDragStart(lead.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => openLead(lead)}
                            className={`bg-zinc-900 border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-yellow-600/50 transition-all ${dragId === lead.id ? "opacity-40 scale-95" : "border-zinc-800"} ${fuStatus === "overdue" ? "border-l-2 border-l-red-500" : fuStatus === "today" ? "border-l-2 border-l-blue-400" : ""}`}>
                            <div className="flex items-start justify-between mb-1">
                              <p className="text-white text-sm font-medium leading-tight">{lead.name}</p>
                              <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${STATUS_COLORS[lead.status]}`} />
                            </div>
                            <p className="text-zinc-500 text-xs">{lead.phone}</p>
                            {lead.property && <p className="text-zinc-600 text-[10px] mt-1 truncate">{lead.property.title}</p>}
                            <div className="flex items-center justify-between mt-2 flex-wrap gap-1">
                              <span className="text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
                                {SOURCE_LABELS[lead.source] ?? lead.source}
                              </span>
                              {fuStatus === "overdue" && <span className="text-[10px] text-red-400 flex items-center gap-0.5"><AlertCircle size={10} /> {formatFollowUp(lead.followUpDate)}</span>}
                              {fuStatus === "today"   && <span className="text-[10px] text-blue-400 flex items-center gap-0.5"><Clock size={10} /> Today</span>}
                              {fuStatus === "upcoming" && <span className="text-[10px] text-zinc-500">{formatFollowUp(lead.followUpDate)}</span>}
                              {lead.leadValue && lead.leadValue > 0 && (
                                <span className="text-[10px] text-green-400">₹{(lead.leadValue / 1e5).toFixed(1)}L</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List view */
            <div className="max-w-5xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                    <th className="text-left py-2 px-3">Name</th>
                    <th className="text-left py-2 px-3">Phone</th>
                    <th className="text-left py-2 px-3">Source</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Follow-up</th>
                    <th className="text-left py-2 px-3">Value</th>
                    <th className="text-left py-2 px-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lead => {
                    const fuStatus = followUpStatus(lead.followUpDate);
                    return (
                      <tr key={lead.id}
                        onClick={() => openLead(lead)}
                        className="border-b border-zinc-800/50 hover:bg-zinc-900 cursor-pointer transition-colors">
                        <td className="py-2.5 px-3 text-white font-medium">{lead.name}</td>
                        <td className="py-2.5 px-3 text-zinc-400">{lead.phone}</td>
                        <td className="py-2.5 px-3 text-zinc-500 text-xs">{SOURCE_LABELS[lead.source] ?? lead.source}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full text-white ${STATUS_COLORS[lead.status]}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {fuStatus === "overdue"  && <span className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={11} /> {formatFollowUp(lead.followUpDate)}</span>}
                          {fuStatus === "today"    && <span className="text-blue-400 text-xs flex items-center gap-1"><Clock size={11} /> Today</span>}
                          {fuStatus === "upcoming" && <span className="text-zinc-400 text-xs">{formatFollowUp(lead.followUpDate)}</span>}
                          {!fuStatus              && <span className="text-zinc-700 text-xs">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-green-400 text-xs">
                          {lead.leadValue ? `₹${(lead.leadValue / 1e5).toFixed(1)}L` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600 text-xs">
                          {new Date(lead.createdAt).toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-zinc-600 text-sm">No leads match your search</div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Lead detail side panel */}
      {selectedLead && (
        <aside className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col shrink-0 overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
            <h2 className="text-white font-semibold text-sm">Lead Details</h2>
            <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white"><X size={16} /></button>
          </div>

          <div className="p-4 space-y-4">
            {/* Info */}
            <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Name</p>
                <p className="text-white font-semibold">{selectedLead.name}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Phone</p>
                <a href={`tel:${selectedLead.phone}`} className="text-yellow-400 hover:text-yellow-300 font-medium text-sm">{selectedLead.phone}</a>
              </div>
              {selectedLead.email && (
                <div>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Email</p>
                  <a href={`mailto:${selectedLead.email}`} className="text-zinc-300 hover:text-white text-sm">{selectedLead.email}</a>
                </div>
              )}
              {selectedLead.message && (
                <div>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Message</p>
                  <p className="text-zinc-300 text-sm leading-relaxed">{selectedLead.message}</p>
                </div>
              )}
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Source</p>
                <p className="text-zinc-300 text-sm">{SOURCE_LABELS[selectedLead.source] ?? selectedLead.source}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Created</p>
                <p className="text-zinc-300 text-xs">{new Date(selectedLead.createdAt).toLocaleString("en-IN")}</p>
              </div>
            </div>

            {/* Follow-up + Value */}
            <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
              <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Follow-up & Value</p>
              <div>
                <label className="text-zinc-500 text-[10px]">Follow-up Date</label>
                <input type="date"
                  value={editFollowUp}
                  onChange={e => setFollowUp(e.target.value)}
                  className="w-full mt-1 bg-zinc-700 border border-zinc-600 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-600" />
              </div>
              <div>
                <label className="text-zinc-500 text-[10px]">Lead Value (₹)</label>
                <div className="relative mt-1">
                  <IndianRupee size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input type="number" min="0"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    placeholder="e.g. 5000000"
                    className="w-full bg-zinc-700 border border-zinc-600 text-white text-xs rounded-lg pl-7 pr-3 py-2 focus:outline-none focus:border-yellow-600" />
                </div>
              </div>
              <button onClick={saveFollowUp}
                className="w-full text-xs font-semibold py-2 rounded-lg text-black"
                style={{ background: "#C9A24B" }}>
                Save Follow-up & Value
              </button>
            </div>

            {/* Move status */}
            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">Move Stage</p>
              <div className="grid grid-cols-2 gap-2">
                {COLUMNS.map(col => (
                  <button key={col.key}
                    onClick={() => moveStatus(selectedLead.id, col.key)}
                    disabled={selectedLead.status === col.key}
                    className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-all ${
                      selectedLead.status === col.key
                        ? "text-black border-yellow-500 font-semibold"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-yellow-500 hover:text-white"
                    }`}
                    style={selectedLead.status === col.key ? { background: "#C9A24B" } : {}}>
                    {col.icon} {col.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes / Timeline */}
            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">Notes & Activity</p>

              {/* Timeline */}
              {(selectedLead.timeline ?? []).length > 0 && (
                <div className="space-y-1.5 mb-3 max-h-32 overflow-y-auto">
                  {[...(selectedLead.timeline ?? [])].reverse().map((entry, i) => (
                    <div key={i} className="flex gap-2 text-[10px]">
                      <span className="text-zinc-600 shrink-0">{new Date(entry.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                      <span className={`${entry.type === "note" ? "text-zinc-300" : "text-yellow-500"}`}>{entry.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedLead.notes && (
                <div className="bg-zinc-800 rounded-lg p-3 mb-2">
                  <p className="text-zinc-400 text-[10px] mb-1">Last Note</p>
                  <p className="text-zinc-300 text-xs leading-relaxed">{selectedLead.notes}</p>
                </div>
              )}
              <textarea
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                rows={3}
                placeholder="Add a note..."
                className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-600 resize-none"
              />
              <button onClick={saveNote} disabled={saving || !noteInput.trim()}
                className="mt-2 w-full text-black text-xs font-semibold py-2 rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                style={{ background: "#C9A24B" }}>
                {saving ? "Saving..." : "Save Note"}
              </button>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-2">
              <a href={`https://wa.me/${toIndianWaNumber(selectedLead.phone)}?text=${encodeURIComponent(`Hi ${selectedLead.name}, this is Raghu from PropKnown. How can I help you?`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-lg font-medium text-white"
                style={{ backgroundColor: "#25D366" }}>
                <MessageSquare size={12} /> WhatsApp
              </a>
              <a href={`tel:${selectedLead.phone}`}
                className="flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-lg font-medium bg-zinc-700 text-white hover:bg-zinc-600 transition-all">
                <Phone size={12} /> Call
              </a>
            </div>
          </div>
        </aside>
      )}

      {/* Add Lead Modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Add Lead Manually</h3>
              <button onClick={() => setAddOpen(false)} className="text-zinc-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Name *", key: "name", type: "text", placeholder: "Full name" },
                { label: "Phone *", key: "phone", type: "tel", placeholder: "+91 XXXXX XXXXX" },
                { label: "Email", key: "email", type: "email", placeholder: "email@example.com" },
                { label: "Message", key: "message", type: "text", placeholder: "Requirements..." },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-zinc-400 text-xs mb-1 block">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder}
                    value={addForm[f.key as keyof typeof addForm]}
                    onChange={e => setAddForm(a => ({ ...a, [f.key]: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-600 placeholder-zinc-600" />
                </div>
              ))}
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Source</label>
                <select value={addForm.source} onChange={e => setAddForm(a => ({ ...a, source: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-2 focus:outline-none">
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <button onClick={addLead} disabled={addLoading || !addForm.name || !addForm.phone}
                className="w-full text-black font-semibold py-2.5 rounded-lg text-sm mt-2 disabled:opacity-50"
                style={{ background: "#C9A24B" }}>
                {addLoading ? "Adding..." : "Add Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
