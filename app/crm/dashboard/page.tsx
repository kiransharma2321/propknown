"use client";

import { useState, useEffect } from "react";
import { Phone, MessageSquare, Calendar, Trophy, X, Home, LogOut, Activity, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";

type LeadStatus = "new" | "contacted" | "visit_booked" | "negotiation" | "won" | "lost";

interface Lead {
  id: string; name: string; email?: string; phone: string;
  message?: string; source: string; status: LeadStatus;
  property?: { id: string; title: string } | null;
  createdAt: string; notes?: string;
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
  chatbot:           "JARVIS Chat",
  brochure:          "Brochure",
  builders:          "Builders",
};

export default function CRMDashboard() {
  const router = useRouter();
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedLead, setSelected] = useState<Lead | null>(null);
  const [note, setNote]             = useState("");
  const [dragId, setDragId]         = useState<string | null>(null);
  const [dragOver, setDragOver]     = useState<LeadStatus | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  const moveStatus = async (id: string, status: LeadStatus) => {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchLeads();
    if (selectedLead?.id === id) setSelected((l) => l ? { ...l, status } : null);
  };

  const handleDragStart = (id: string) => setDragId(id);
  const handleDragEnd   = () => { setDragId(null); setDragOver(null); };
  const handleDragOver  = (e: React.DragEvent, col: LeadStatus) => { e.preventDefault(); setDragOver(col); };
  const handleDrop      = (col: LeadStatus) => {
    if (dragId) { moveStatus(dragId, col); }
    setDragId(null); setDragOver(null);
  };

  const saveNote = async () => {
    if (!selectedLead || !note.trim()) return;
    await fetch(`/api/leads/${selectedLead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: note }),
    });
    setNote("");
    fetchLeads();
  };

  const byStatus = (status: LeadStatus) => leads.filter((l) => l.status === status);

  const stats = {
    total: leads.length,
    new:   byStatus("new").length,
    won:   byStatus("won").length,
    lost:  byStatus("lost").length,
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "crm" }) });
    router.push("/crm");
  };

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
        <div className="bg-black border-b border-zinc-800 px-6 py-4 flex items-center justify-between shrink-0">
          <h1 className="text-white font-semibold">Lead Pipeline</h1>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-zinc-400">Total: <span className="text-white font-bold">{stats.total}</span></span>
            <span className="text-zinc-400">New: <span className="text-blue-400 font-bold">{stats.new}</span></span>
            <span className="text-zinc-400">Won: <span className="text-green-400 font-bold">{stats.won}</span></span>
            <span className="text-zinc-400">Lost: <span className="text-red-400 font-bold">{stats.lost}</span></span>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-zinc-500">Loading leads...</div>
          ) : (
            <div className="flex gap-4 min-w-max h-full">
              {COLUMNS.map((col) => {
                const colLeads = byStatus(col.key);
                const isOver   = dragOver === col.key;
                return (
                  <div
                    key={col.key}
                    className={`w-64 rounded-xl border p-3 flex flex-col transition-all ${col.color} ${isOver ? "ring-2 ring-yellow-500/60 scale-[1.01]" : ""}`}
                    onDragOver={(e) => handleDragOver(e, col.key)}
                    onDrop={() => handleDrop(col.key)}
                  >
                    {/* Column header */}
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2 text-zinc-300 text-sm font-semibold">
                        {col.icon}
                        {col.label}
                      </div>
                      <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">{colLeads.length}</span>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 space-y-2 overflow-y-auto min-h-[60px]">
                      {colLeads.length === 0 ? (
                        <div className={`text-xs text-center py-6 rounded-lg border border-dashed transition-colors ${isOver ? "border-yellow-500/40 text-yellow-600/60" : "border-zinc-800 text-zinc-700"}`}>
                          {isOver ? "Drop here" : "No leads"}
                        </div>
                      ) : colLeads.map((lead) => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={() => handleDragStart(lead.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => setSelected(lead)}
                          className={`bg-zinc-900 border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-yellow-600/50 transition-all ${dragId === lead.id ? "opacity-40 scale-95" : "border-zinc-800"}`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-white text-sm font-medium leading-tight">{lead.name}</p>
                            <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${STATUS_COLORS[lead.status]}`} />
                          </div>
                          <p className="text-zinc-500 text-xs">{lead.phone}</p>
                          {lead.property && <p className="text-zinc-600 text-[10px] mt-1 truncate">{lead.property.title}</p>}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
                              {SOURCE_LABELS[lead.source] ?? lead.source}
                            </span>
                            <span className="text-[10px] text-zinc-700">
                              {new Date(lead.createdAt).toLocaleDateString("en-IN")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Lead detail side panel */}
      {selectedLead && (
        <aside className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col shrink-0">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h2 className="text-white font-semibold text-sm">Lead Details</h2>
            <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Info */}
            <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Name</p>
                <p className="text-white font-semibold">{selectedLead.name}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Phone</p>
                <a href={`tel:${selectedLead.phone}`} className="text-gold-400 hover:text-gold-300 font-medium">{selectedLead.phone}</a>
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
            </div>

            {/* Move status */}
            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">Move To Stage</p>
              <div className="grid grid-cols-2 gap-2">
                {COLUMNS.map((col) => (
                  <button
                    key={col.key}
                    onClick={() => moveStatus(selectedLead.id, col.key)}
                    disabled={selectedLead.status === col.key}
                    className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-all ${
                      selectedLead.status === col.key
                        ? "bg-gold-500 text-black border-gold-500 font-semibold"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-gold-500 hover:text-white"
                    }`}
                  >
                    {col.icon}
                    {col.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">Notes</p>
              {selectedLead.notes && (
                <div className="bg-zinc-800 rounded-lg p-3 mb-2">
                  <p className="text-zinc-300 text-xs leading-relaxed">{selectedLead.notes}</p>
                </div>
              )}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Add a note..."
                className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-gold-500 resize-none"
              />
              <button onClick={saveNote} className="mt-2 w-full bg-gold-500 text-black text-xs font-semibold py-2 rounded-lg hover:bg-gold-400 transition-all">
                Save Note
              </button>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://wa.me/${selectedLead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${selectedLead.name}, this is Raghu from PropKnown. I wanted to follow up on your property enquiry. How can I help you?`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg font-medium text-white"
                style={{ backgroundColor: "#25D366" }}>
                <Phone size={12} /> WhatsApp
              </a>
              <a href={`tel:${selectedLead.phone}`}
                className="flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg font-medium bg-zinc-700 text-white hover:bg-zinc-600 transition-all">
                <Phone size={12} /> Call
              </a>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
