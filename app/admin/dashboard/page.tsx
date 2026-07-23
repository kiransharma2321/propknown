"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { Plus, Trash2, CheckCircle, XCircle, Shield, LogOut, LayoutDashboard, Home, Users, Brain, Zap, Copy, Check, Loader2, FileText, Inbox, Image as ImageIcon, Video, Phone, Mail, Download, History } from "lucide-react";
import NotificationBell from "@/components/admin/NotificationBell";
import { useRouter, useSearchParams } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import type { VerificationFlags } from "@/components/ui/VerificationBadge";
import { LEGAL_CHECKLIST_ITEMS, type LegalChecklist, type ChecklistStatus } from "@/lib/legalShield";
import { PRESET_MILESTONES, type ConstructionMilestone } from "@/lib/constructionProgress";
import { toIndianWaNumber } from "@/lib/phone";
import PKLogo from "@/components/layout/PKLogo";

interface DocFile {
  id: string; name: string; type: string; size: number; data: string;
}

interface Property {
  id: string; title: string; location: string; city: string;
  price: number; currency: string; status: string; propertyType?: string;
  reraVerified: boolean; realPhotos: boolean; accuratePrice: boolean; ownerConsent: boolean;
  createdAt: string;
  documents?: DocFile[];
  // AI scores (Section 5 / Q) -- populated only by the "Score" action below, never fabricated.
  aiScore?: number | null; legalScore?: number | null; aiScoredAt?: string | null;
}

const EMPTY_FORM = {
  title: "", location: "", city: "Hyderabad", state: "Telangana", country: "India",
  price: "", currency: "INR", beds: "", baths: "", sqft: "",
  propertyType: "apartment", listingType: "sale",
  reraNumber: "", description: "", featured: false,
  reraVerified: false, realPhotos: false, accuratePrice: false, ownerConsent: false,
};

const CHECKLIST_ITEMS = [
  "RERA or HMDA number verified",
  "Owner identity verified",
  "Title deed checked with no disputes",
  "Real photos - not stock images",
  "Accurate price within 20% of market rate",
  "Correct area measurement and unit",
  "Owner consent obtained",
  "No false or misleading claims",
  "Location pinned correctly on map",
  "Contact details verified and working",
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all"
    >
      {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

type ChatMsg = { role: "user" | "assistant"; content: string; ts: string };

function AiBrainTab() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [mode,     setMode]     = useState("Auto");
  const [error,    setError]    = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput(""); setError("");
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const nextMessages: ChatMsg[] = [...messages, { role: "user", content: userMsg, ts }];
    setMessages(nextMessages);
    setLoading(true);
    try {
      const history = nextMessages.slice(-20).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/ai-brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, mode, history: history.slice(0, -1) }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || "AI Brain error"); return; }
      setMessages(prev => [...prev, { role: "assistant", content: data.reply, ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    } catch { setError("Network error. Please check your connection."); }
    finally { setLoading(false); }
  };

  const HINTS = [
    "Show all listings",
    "Show today's leads",
    "Add 3BHK apartment in Kokapet, Hyderabad for 1.5Cr",
    "Write a WhatsApp follow-up for a villa buyer",
    "Write a property description for My Home Bhooja",
    "Show leads this week",
  ];

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 160px)", minHeight: "560px" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 shrink-0">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-gray-900">AI Brain</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage listings, leads, and generate content in plain English</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">Mode:</span>
          <select value={mode} onChange={e => setMode(e.target.value)}
            className="bg-gray-100 border border-gray-200 text-gray-800 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#D6A63E]">
            {["Auto", "Manage Listings", "Manage Leads", "Write Content"].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <Brain size={36} className="mb-3 text-gray-400" />
            <p className="text-gray-500 text-sm mb-1">Ask AI Brain anything</p>
            <p className="text-gray-400 text-xs mb-6">Add listings · manage leads · generate content · search data</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {HINTS.map(h => (
                <button key={h} onClick={() => setInput(h)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-[#D6A63E]/60 hover:text-gray-900 transition-all text-left">
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "user" ? (
              <div className="max-w-sm bg-gray-100 rounded-2xl rounded-tr-sm px-4 py-2.5">
                <p className="text-gray-900 text-sm leading-relaxed">{m.content}</p>
                <p className="text-gray-400 text-[10px] mt-1 text-right">{m.ts}</p>
              </div>
            ) : (
              <div className="max-w-2xl w-full">
                <div className="bg-gray-100 border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Brain size={11} style={{ color: "var(--gold)" }} />
                      <span className="text-[10px] text-gray-500">AI Brain Â· {m.ts}</span>
                    </div>
                    <CopyButton text={m.content} />
                  </div>
                  <pre className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed font-sans">{m.content}</pre>
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 size={13} className="animate-spin" style={{ color: "var(--gold)" }} />
              <span className="text-gray-500 text-sm">AI Brain is thinkingâ€¦</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-2.5">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 shrink-0">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={2}
            placeholder={mode === "Write Content"
              ? "e.g. Write a WhatsApp follow-up for a 3BHK villa buyer in Hyderabadâ€¦"
              : mode === "Manage Leads"
              ? "e.g. Show today's leads Â· Mark lead as contacted Â· Show won leads this monthâ€¦"
              : "e.g. Add listing: My Home Bhooja 3BHK, Kokapet, 1.5Cr, RERA P02400008234â€¦"}
            className="flex-1 bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-400 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#D6A63E] resize-none"
          />
          <button onClick={send} disabled={loading || !input.trim()}
            className="px-5 rounded-lg font-semibold text-navy text-sm disabled:opacity-40 transition-colors duration-200 flex flex-col items-center justify-center gap-1 shrink-0"
            style={{ background: "var(--gold)" }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
            <span className="text-[10px]">Send</span>
          </button>
        </div>
        <div className="flex justify-between items-center mt-1.5 px-1">
          <p className="text-gray-400 text-[11px]">Enter to send Â· Shift+Enter for new line</p>
          {messages.length > 0 && (
            <button onClick={() => { setMessages([]); setError(""); }}
              className="text-gray-400 hover:text-gray-500 text-[11px] transition-colors">
              Clear chat ({messages.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAddTab() {
  const [rawText, setRawText]       = useState("");
  const [parsing, setParsing]       = useState(false);
  const [photos, setPhotos]         = useState<File[]>([]);
  const [videoUrl, setVideoUrl]     = useState("");
  const [dragging, setDragging]     = useState(false);
  const [checklist, setChecklist]   = useState<boolean[]>(new Array(CHECKLIST_ITEMS.length).fill(false));
  const [rejectReason, setRejectReason] = useState("");
  const [parsed, setParsed]         = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allChecked = checklist.every(Boolean);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    setPhotos(prev => [...prev, ...files].slice(0, 10));
  }, []);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setPhotos(prev => [...prev, ...files].slice(0, 10));
  };

  const parseText = async () => {
    if (!rawText.trim()) return;
    setParsing(true);
    try {
      const res = await fetch("/api/ai-brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Extract property listing data from this text and return ONLY a JSON object with these fields: title, location, city, state, price (number only, no currency symbols, in INR rupees), currency (INR/AED/USD), beds (number), baths (number), sqft (number), propertyType (apartment/villa/plot/commercial/farmland/independent_house), listingType (sale/rent), reraNumber, description. Text:\n\n${rawText}`,
          mode: "Auto",
          history: [],
        }),
      });
      const data = await res.json();
      try {
        const jsonMatch = (data.reply || "")?.match(/\{[\s\S]*\}/);
        if (jsonMatch) setParsed(JSON.parse(jsonMatch[0]));
      } catch { setParsed({ title: rawText.substring(0, 60) }); }
    } catch { /**/ }
    finally { setParsing(false); }
  };

  const inpCls = "bg-gray-100 border border-gray-200 text-gray-900 text-sm rounded-lg px-3 py-2 w-full focus:outline-none focus:border-[#D6A63E] placeholder-gray-400";

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-playfair text-2xl font-bold text-gray-900 mb-1">Quick Add Listing</h1>
        <p className="text-gray-500 text-sm">Paste any property details — AI auto-fills the form. Upload photos. Tick all 10 checklist items to approve.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          {/* Paste area */}
          <div>
            <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 block">Paste Property Details</label>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              rows={6}
              className={`${inpCls} resize-none`}
              placeholder="Paste any format: WhatsApp message, email, brochure text, broker notes, MagicBricks link textâ€¦"
            />
            <button onClick={parseText} disabled={parsing || !rawText.trim()}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-navy disabled:opacity-50 transition-all"
              style={{ background: "var(--gold)" }}>
              {parsing ? <><Loader2 size={14} className="animate-spin" /> Parsing...</> : <><Brain size={14} /> AI Auto-Fill</>}
            </button>
          </div>

          {/* Parsed form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ["Title", "title"], ["Location", "location"], ["City", "city"], ["State", "state"],
              ["Price", "price"], ["Beds", "beds"], ["Baths", "baths"], ["Sqft", "sqft"],
              ["RERA No.", "reraNumber"], ["Property Type", "propertyType"],
            ].map(([label, key]) => (
              <div key={key}>
                <label className="text-gray-500 text-[10px] mb-1 block">{label}</label>
                <input value={parsed[key] ?? ""} onChange={e => setParsed({ ...parsed, [key]: e.target.value })}
                  className={inpCls} placeholder={label} />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="text-gray-500 text-[10px] mb-1 block">Description</label>
              <textarea value={parsed["description"] ?? ""} onChange={e => setParsed({ ...parsed, description: e.target.value })}
                rows={3} className={`${inpCls} resize-none`} placeholder="Property description" />
            </div>
          </div>

          {/* Video URL */}
          <div>
            <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 block">Video URL (YouTube / Matterport 3D)</label>
            <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className={inpCls} placeholder="https://youtube.com/... or https://my.matterport.com/..." />
          </div>
        </div>

        <div className="space-y-5">
          {/* Photo upload */}
          <div>
            <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 block">Photos ({photos.length}/10)</label>
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dragging ? "border-[#D6A63E] bg-[#D6A63E]/5" : "border-gray-200 hover:border-gray-300"}`}
            >
              <p className="text-gray-500 text-sm">Drag &amp; drop photos here or click to browse</p>
              <p className="text-gray-400 text-xs mt-1">JPG, PNG — up to 10 photos</p>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
            </div>
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {photos.map((f, i) => (
                  <div key={i} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-400 text-lg">âœ•</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 10-point checklist */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} style={{ color: "var(--gold)" }} />
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">10-Point Approval Checklist</p>
            </div>
            <div className="space-y-2">
              {CHECKLIST_ITEMS.map((item, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checklist[i]}
                    onChange={e => setChecklist(prev => prev.map((v, j) => j === i ? e.target.checked : v))}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: "var(--gold)" }}
                  />
                  <span className={`text-sm transition-colors ${checklist[i] ? "text-gray-700 line-through opacity-60" : "text-gray-500"}`}>{item}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {checklist.filter(Boolean).length}/{CHECKLIST_ITEMS.length} completed
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button disabled={!allChecked}
              className="w-full py-3 rounded-lg font-bold text-navy transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--gold)" }}>
              {allChecked ? "✓ Approve & Publish" : "Complete All 10 Checklist Items to Approve"}
            </button>
            <div>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2}
                className={`${inpCls} resize-none`} placeholder="Rejection reason (required for reject)..." />
              <button disabled={!rejectReason.trim()}
                className="mt-2 w-full py-2 rounded-xl font-semibold text-sm border border-red-700 text-red-600 hover:bg-red-900/30 transition-all disabled:opacity-40">
                Reject Listing
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SUBMISSIONS TAB
// ─────────────────────────────────────────────────────────────────

interface SubListItem {
  id: string; title: string; propType: string; bhk?: string;
  priceDisplay: string; city: string; area: string;
  ownerName: string; ownerPhone: string; ownerEmail: string;
  reraNumber?: string; status: string; rejectReason?: string;
  createdAt: string; photoCount: number; videoCount: number; docCount: number;
}

interface SubDetail extends SubListItem {
  description: string; features?: string; size?: string; sizeUnit?: string;
  adminNotes?: string; videoUrls: string[];
  photoFiles: { id: string; name: string; mimeType: string; data: string }[];
  videoFiles: { id: string; name: string; mimeType: string; data: string }[];
  docFiles:   { id: string; name: string; mimeType: string; docType?: string; data: string }[];
  verificationFlags?: VerificationFlags;
  legalChecklist?: LegalChecklist;
  legalNotes?: string;
  constructionMilestones?: ConstructionMilestone[];
  constructionPct?: number;
  expectedCompletion?: string;
}

function SubmissionsTab() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [list,        setList]         = useState<SubListItem[]>([]);
  const [loadingList, setLoadingList]  = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const [reviewing,  setReviewing]  = useState<SubDetail | null>(null);
  const [loadDetail, setLoadDetail] = useState(false);
  const [rejectMsg,  setRejectMsg]  = useState("");
  const [acting,     setActing]     = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [vFlags,     setVFlags]     = useState<VerificationFlags>({});
  const [savingVFlags, setSavingVFlags] = useState(false);
  const [legal,      setLegal]      = useState<LegalChecklist>({});
  const [legalNotesDraft, setLegalNotesDraft] = useState("");
  const [savingLegal, setSavingLegal] = useState(false);
  const [milestones, setMilestones] = useState<ConstructionMilestone[]>([]);
  const [pctDraft,   setPctDraft]   = useState("");
  const [completionDraft, setCompletionDraft] = useState("");
  const [newMilestone, setNewMilestone] = useState({ title: PRESET_MILESTONES[0], customTitle: "", date: "", note: "" });
  const [milestonePhoto, setMilestonePhoto] = useState<File | null>(null);
  const [savingConstruction, setSavingConstruction] = useState(false);

  const inpCls = "bg-gray-100 border border-gray-200 text-gray-900 text-sm rounded-lg px-3 py-2 w-full focus:outline-none focus:border-[#D6A63E] placeholder-gray-400";

  const fetchList = async (st = statusFilter) => {
    setLoadingList(true);
    try {
      const [listRes, pendRes] = await Promise.all([
        fetch(`/api/admin/submissions?status=${st}`).then(r => r.json()),
        fetch("/api/admin/submissions?status=pending").then(r => r.json()),
      ]);
      setList(Array.isArray(listRes) ? listRes : []);
      setPendingCount(Array.isArray(pendRes) ? pendRes.length : 0);
    } catch { setList([]); }
    finally { setLoadingList(false); }
  };

  useEffect(() => { fetchList(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changeFilter = (f: "pending" | "approved" | "rejected" | "all") => {
    setStatusFilter(f);
    fetchList(f);
  };

  const openDetail = async (id: string) => {
    setLoadDetail(true); setReviewing(null); setActivePhoto(0); setRejectMsg("");
    try {
      const d = await fetch(`/api/admin/submissions/${id}`).then(r => r.json());
      setReviewing(d);
      setVFlags(d.verificationFlags ?? {});
      setLegal(d.legalChecklist ?? {});
      setLegalNotesDraft(d.legalNotes ?? "");
      setMilestones(Array.isArray(d.constructionMilestones) ? d.constructionMilestones : []);
      setPctDraft(d.constructionPct != null ? String(d.constructionPct) : "");
      setCompletionDraft(d.expectedCompletion ?? "");
      setNewMilestone({ title: PRESET_MILESTONES[0], customTitle: "", date: "", note: "" });
      setMilestonePhoto(null);
    } catch { alert("Failed to load submission."); }
    finally { setLoadDetail(false); }
  };

  const saveVerification = async () => {
    if (!reviewing) return;
    setSavingVFlags(true);
    try {
      await fetch(`/api/admin/submissions/${reviewing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationFlags: vFlags }),
      });
      setReviewing(r => r ? { ...r, verificationFlags: vFlags } : r);
    } finally {
      setSavingVFlags(false);
    }
  };

  const saveLegalChecklist = async () => {
    if (!reviewing) return;
    setSavingLegal(true);
    try {
      await fetch(`/api/admin/submissions/${reviewing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legalChecklist: legal, legalNotes: legalNotesDraft.trim() || null }),
      });
      setReviewing(r => r ? { ...r, legalChecklist: legal, legalNotes: legalNotesDraft.trim() } : r);
    } finally {
      setSavingLegal(false);
    }
  };

  const saveConstruction = async (updatedMilestones = milestones) => {
    if (!reviewing) return;
    setSavingConstruction(true);
    try {
      const pct = pctDraft.trim() ? Math.max(0, Math.min(100, Number(pctDraft))) : null;
      await fetch(`/api/admin/submissions/${reviewing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          constructionMilestones: updatedMilestones,
          constructionPct: pct,
          expectedCompletion: completionDraft.trim() || null,
        }),
      });
      setMilestones(updatedMilestones);
      setReviewing(r => r ? { ...r, constructionMilestones: updatedMilestones, constructionPct: pct ?? undefined, expectedCompletion: completionDraft.trim() } : r);
    } catch {
      alert("Failed to save construction progress.");
    } finally {
      setSavingConstruction(false);
    }
  };

  const addMilestone = async () => {
    if (!reviewing) return;
    const title = newMilestone.title === "Custom" ? newMilestone.customTitle.trim() : newMilestone.title;
    if (!title || !newMilestone.date) { alert("Please choose a milestone stage and date."); return; }

    setSavingConstruction(true);
    try {
      let photoUrl: string | undefined;
      if (milestonePhoto) {
        try {
          const fd = new FormData();
          fd.append("file", milestonePhoto);
          const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
          const uploadData = await uploadRes.json();
          if (uploadRes.ok && uploadData.id) photoUrl = `/api/files/${uploadData.id}`;
        } catch {
          // Photo upload failure shouldn't block saving the milestone itself
        }
      }

      const milestone: ConstructionMilestone = {
        id: `m-${Date.now()}`,
        title,
        date: newMilestone.date,
        note: newMilestone.note.trim() || undefined,
        photoUrl,
      };
      const updated = [...milestones, milestone];
      await saveConstruction(updated);
      setNewMilestone({ title: PRESET_MILESTONES[0], customTitle: "", date: "", note: "" });
      setMilestonePhoto(null);
    } finally {
      setSavingConstruction(false);
    }
  };

  const removeMilestone = (id: string) => {
    const updated = milestones.filter(m => m.id !== id);
    saveConstruction(updated);
  };

  const doAction = async (action: "approve" | "reject") => {
    if (!reviewing) return;
    if (action === "reject" && !rejectMsg.trim()) { alert("Please enter a rejection reason."); return; }
    setActing(true);
    await fetch(`/api/admin/submissions/${reviewing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: rejectMsg.trim() || undefined }),
    });
    setActing(false);
    setReviewing(null);
    fetchList();
  };

  const doDelete = async (id: string) => {
    if (!confirm("Permanently delete this submission?")) return;
    await fetch(`/api/admin/submissions/${id}`, { method: "DELETE" });
    if (reviewing?.id === id) setReviewing(null);
    fetchList();
  };

  const isYoutube = (url: string) => url.includes("youtube.com") || url.includes("youtu.be");
  const ytEmbed   = (url: string) => {
    const m = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : url;
  };

  const STATUS_TABS = [
    { key: "pending",  label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "all",      label: "All" },
  ] as const;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-playfair text-xl font-bold text-gray-900">Property Submissions</h1>
          {pendingCount > 0 && (
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingCount} pending</span>
          )}
        </div>
        <button onClick={() => fetchList()} className="text-gray-500 hover:text-gray-900 text-sm border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">
          Refresh
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-5">
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => changeFilter(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${statusFilter === t.key ? "text-navy" : "bg-gray-100 text-gray-500 hover:text-gray-900"}`}
            style={statusFilter === t.key ? { background: "var(--gold)" } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                {["Property", "Location", "Price", "Contact", "Files", "Status", "Date", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loadingList ? (
                <tr><td colSpan={8} className="text-center py-10"><Loader2 size={20} className="mx-auto animate-spin text-gray-500" /></td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-500">No {statusFilter} submissions.</td></tr>
              ) : list.map(s => (
                <tr key={s.id} className="hover:bg-gray-100 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-gray-900 font-medium line-clamp-1">{s.title}</p>
                    <p className="text-gray-500 text-xs">{s.propType}{s.bhk ? ` · ${s.bhk}` : ""}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-xs">{s.area}, {s.city}</td>
                  <td className="px-4 py-3 font-semibold text-sm" style={{ color: "var(--gold)" }}>{s.priceDisplay}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-800 text-xs">{s.ownerName}</p>
                    <a href={`tel:${s.ownerPhone}`} className="text-[#D6A63E] hover:underline text-xs">{s.ownerPhone}</a>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 text-xs">
                      {s.photoCount > 0 && <span className="flex items-center gap-0.5 text-gray-500"><ImageIcon size={10} />{s.photoCount}</span>}
                      {s.videoCount > 0 && <span className="flex items-center gap-0.5 text-gray-500"><Video size={10} />{s.videoCount}</span>}
                      {s.docCount > 0 && <span className="flex items-center gap-0.5 text-[#D6A63E]"><FileText size={10} />{s.docCount}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.status === "approved" ? "bg-green-900/60 text-green-400" :
                      s.status === "rejected" ? "bg-red-900/60 text-red-400" :
                      "bg-yellow-900/60 text-yellow-400"
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(s.createdAt).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openDetail(s.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:border-[#D6A63E] hover:text-[#D6A63E] transition-all">
                        Review
                      </button>
                      <button onClick={() => doDelete(s.id)} className="text-gray-400 hover:text-red-400 transition-colors p-1.5">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {(loadDetail || reviewing) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto" onClick={() => !acting && setReviewing(null)}>
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-4xl shadow-2xl mt-4 mb-4" onClick={e => e.stopPropagation()}>
            {loadDetail ? (
              <div className="p-20 text-center"><Loader2 size={28} className="mx-auto animate-spin" style={{ color: "var(--gold)" }} /></div>
            ) : reviewing && (
              <>
                {/* Modal header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-200">
                  <div>
                    <h2 className="font-playfair text-gray-900 font-bold text-lg">{reviewing.title}</h2>
                    <p className="text-gray-500 text-sm mt-0.5">{reviewing.propType}{reviewing.bhk ? ` · ${reviewing.bhk}` : ""} · {reviewing.area}, {reviewing.city}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      reviewing.status === "approved" ? "bg-green-900/60 text-green-400" :
                      reviewing.status === "rejected" ? "bg-red-900/60 text-red-400" :
                      "bg-yellow-900/60 text-yellow-400"
                    }`}>{reviewing.status}</span>
                    <button onClick={() => setReviewing(null)} className="text-gray-500 hover:text-gray-900 transition-colors"><XCircle size={20} /></button>
                  </div>
                </div>

                <div className="p-6 grid lg:grid-cols-3 gap-6">
                  {/* Left: Photos + Videos */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* Photos */}
                    {reviewing.photoFiles.length > 0 && (
                      <div>
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <ImageIcon size={12} /> Photos ({reviewing.photoFiles.length})
                        </p>
                        <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden mb-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={reviewing.photoFiles[activePhoto]?.data} alt="" className="w-full h-full object-cover" />
                        </div>
                        {reviewing.photoFiles.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {reviewing.photoFiles.map((f, i) => (
                              <button key={f.id} onClick={() => setActivePhoto(i)}
                                className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${activePhoto === i ? "border-[#D6A63E]" : "border-gray-200"}`}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={f.data} alt="" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Videos */}
                    {(reviewing.videoFiles.length > 0 || reviewing.videoUrls.length > 0) && (
                      <div>
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Video size={12} /> Videos
                        </p>
                        <div className="space-y-3">
                          {reviewing.videoFiles.map(v => (
                            <video key={v.id} src={v.data} controls className="w-full rounded-xl bg-white max-h-48" />
                          ))}
                          {reviewing.videoUrls.map((url, i) => (
                            isYoutube(url) ? (
                              <iframe key={i} src={ytEmbed(url)} title="Property video" className="w-full aspect-video rounded-xl" allowFullScreen />
                            ) : (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                className="block text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:border-[#D6A63E] hover:text-gray-900 transition-all">
                                Video link: {url}
                              </a>
                            )
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <div className="bg-gray-100 rounded-xl p-4">
                      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Description</p>
                      <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">{reviewing.description}</p>
                    </div>

                    {reviewing.features && (
                      <div className="bg-gray-100 rounded-xl p-4">
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Features</p>
                        <p className="text-gray-800 text-sm">{reviewing.features}</p>
                      </div>
                    )}

                    {/* Documents — admin only */}
                    {reviewing.docFiles.length > 0 && (
                      <div>
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <FileText size={12} /> Documents ({reviewing.docFiles.length}) — admin only
                        </p>
                        <div className="space-y-2">
                          {reviewing.docFiles.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText size={13} className="text-[#D6A63E] shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-gray-800 text-xs truncate">{doc.name}</p>
                                  {doc.docType && <p className="text-gray-500 text-[10px]">{doc.docType}</p>}
                                </div>
                              </div>
                              <a href={doc.data} download={doc.name}
                                className="shrink-0 ml-3 flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all"
                                style={{ background: "rgba(214,166,62,0.15)", color: "var(--gold)", border: "1px solid rgba(214,166,62,0.4)" }}>
                                <Download size={11} /> Download
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Info + Actions */}
                  <div className="space-y-4">
                    {/* Property info */}
                    <div className="bg-gray-100 rounded-xl p-4 space-y-2 text-sm">
                      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Property Info</p>
                      {[
                        ["Price",    reviewing.priceDisplay],
                        ["Type",     `${reviewing.propType}${reviewing.bhk ? ` · ${reviewing.bhk}` : ""}`],
                        ["Location", `${reviewing.area}, ${reviewing.city}`],
                        reviewing.size ? ["Size", `${reviewing.size} ${reviewing.sizeUnit}`] : null,
                        reviewing.reraNumber ? ["RERA", reviewing.reraNumber] : null,
                      ].filter(Boolean).map((row) => (
                        <div key={row![0] as string} className="flex gap-2">
                          <span className="text-gray-500 w-18 shrink-0 text-xs">{row![0] as string}</span>
                          <span className="text-gray-800 text-xs">{row![1] as string}</span>
                        </div>
                      ))}
                    </div>

                    {/* Submitter contact */}
                    <div className="bg-gray-100 rounded-xl p-4 space-y-3">
                      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Submitter Contact</p>
                      <p className="text-gray-900 font-semibold text-sm">{reviewing.ownerName}</p>
                      <a href={`tel:${reviewing.ownerPhone}`} className="flex items-center gap-2 text-[#D6A63E] hover:underline text-sm">
                        <Phone size={13} /> {reviewing.ownerPhone}
                      </a>
                      <a href={`mailto:${reviewing.ownerEmail}`} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-xs">
                        <Mail size={12} /> {reviewing.ownerEmail}
                      </a>
                      <a href={`https://wa.me/91${reviewing.ownerPhone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(`Hi ${reviewing.ownerName}, this is PropKnown regarding your property "${reviewing.title}".`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg font-semibold transition-all"
                        style={{ background: "#25D366", color: "#fff" }}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        WhatsApp Owner
                      </a>
                    </div>

                    {/* Doc summary */}
                    <div className="text-gray-500 text-xs bg-gray-100 rounded-lg p-3">
                      Docs: {reviewing.docFiles.length} uploaded · Photos: {reviewing.photoFiles.length} · Videos: {reviewing.videoFiles.length + reviewing.videoUrls.length}
                    </div>

                    {/* PropKnown Verified checks — honesty-first: stamp only reflects what's
                        actually ticked here. Independent of approve/reject status. */}
                    <div className="bg-gray-100 rounded-xl p-4 space-y-2.5">
                      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Shield size={12} /> PropKnown Verified Checks
                      </p>
                      {([
                        ["reraVerified", "RERA Registered"],
                        ["titleVerified", "Title / Ownership Clear"],
                        ["documentsChecked", "Documents Checked"],
                        ["layoutApproved", "Approved Layout (HMDA/DTCP)"],
                        ["encumbranceClear", "Encumbrance Clear"],
                      ] as [keyof VerificationFlags, string][]).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!vFlags[key]}
                            onChange={e => setVFlags(f => ({ ...f, [key]: e.target.checked }))}
                            className="w-3.5 h-3.5 accent-[#D6A63E]"
                          />
                          {label}
                        </label>
                      ))}
                      {vFlags.reraVerified && (
                        <input
                          value={vFlags.reraNumber ?? ""}
                          onChange={e => setVFlags(f => ({ ...f, reraNumber: e.target.value }))}
                          placeholder="RERA number"
                          className={`${inpCls} text-xs py-1.5`}
                        />
                      )}
                      {vFlags.layoutApproved && (
                        <input
                          value={vFlags.layoutBadge ?? ""}
                          onChange={e => setVFlags(f => ({ ...f, layoutBadge: e.target.value }))}
                          placeholder="Layout badge (e.g. HMDA, DTCP)"
                          className={`${inpCls} text-xs py-1.5`}
                        />
                      )}
                      <button
                        onClick={saveVerification}
                        disabled={savingVFlags}
                        className="w-full py-2 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50"
                        style={{ borderColor: "rgba(214,166,62,0.5)", color: "var(--gold)" }}
                      >
                        {savingVFlags ? "Saving…" : "Save Verification Checks"}
                      </button>
                    </div>

                    {/* Legal Safety Checklist — 3-way status per item, honest defaults to "pending" */}
                    <div className="bg-gray-100 rounded-xl p-4 space-y-2.5">
                      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Shield size={12} /> Legal Safety Checklist
                      </p>
                      {LEGAL_CHECKLIST_ITEMS.map((item) => (
                        <div key={item.key} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700 truncate">{item.label}</span>
                          <select
                            value={legal[item.key] ?? "pending"}
                            onChange={e => setLegal(l => ({ ...l, [item.key]: e.target.value as ChecklistStatus }))}
                            className="bg-gray-100 border border-gray-200 text-gray-900 text-[11px] rounded-md px-2 py-1 focus:outline-none focus:border-[#D6A63E] shrink-0"
                          >
                            <option value="pending">Pending</option>
                            <option value="verified">Verified</option>
                            <option value="na">N/A</option>
                          </select>
                        </div>
                      ))}
                      <textarea
                        value={legalNotesDraft}
                        onChange={e => setLegalNotesDraft(e.target.value)}
                        rows={2}
                        placeholder="Notes for buyers (optional)…"
                        className={`${inpCls} text-xs resize-none`}
                      />
                      <button
                        onClick={saveLegalChecklist}
                        disabled={savingLegal}
                        className="w-full py-2 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50"
                        style={{ borderColor: "rgba(214,166,62,0.5)", color: "var(--gold)" }}
                      >
                        {savingLegal ? "Saving…" : "Save Legal Checklist"}
                      </button>
                    </div>

                    {/* Construction Progress — only appears on the property page once at
                        least one milestone exists here; there's no separate on/off flag. */}
                    <div className="bg-gray-100 rounded-xl p-4 space-y-3">
                      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <Home size={12} /> Construction Progress
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Overall % complete</label>
                          <input type="number" min={0} max={100} value={pctDraft}
                            onChange={e => setPctDraft(e.target.value)} placeholder="e.g. 45"
                            className={`${inpCls} text-xs py-1.5`} />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Expected completion</label>
                          <input type="date" value={completionDraft}
                            onChange={e => setCompletionDraft(e.target.value)}
                            className={`${inpCls} text-xs py-1.5`} />
                        </div>
                      </div>
                      <button
                        onClick={() => saveConstruction()}
                        disabled={savingConstruction}
                        className="w-full py-1.5 rounded-lg text-[11px] font-semibold border transition-all disabled:opacity-50"
                        style={{ borderColor: "rgba(214,166,62,0.4)", color: "var(--gold)" }}
                      >
                        Save % / Date
                      </button>

                      {milestones.length > 0 && (
                        <div className="space-y-1.5 border-t border-gray-200 pt-2">
                          {milestones.map(m => (
                            <div key={m.id} className="flex items-center justify-between gap-2 text-[11px] text-gray-700">
                              <span className="truncate">{m.title} — {m.date}{m.photoUrl ? " 📷" : ""}</span>
                              <button onClick={() => removeMilestone(m.id)} className="text-red-400 hover:text-red-300 shrink-0">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="border-t border-gray-200 pt-2.5 space-y-2">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Add Milestone</p>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={newMilestone.title}
                            onChange={e => setNewMilestone(nm => ({ ...nm, title: e.target.value }))}
                            className="bg-gray-100 border border-gray-200 text-gray-900 text-[11px] rounded-md px-2 py-1.5 focus:outline-none focus:border-[#D6A63E]"
                          >
                            {PRESET_MILESTONES.map(p => <option key={p} value={p}>{p}</option>)}
                            <option value="Custom">Custom…</option>
                          </select>
                          <input type="date" value={newMilestone.date}
                            onChange={e => setNewMilestone(nm => ({ ...nm, date: e.target.value }))}
                            className={`${inpCls} text-[11px] py-1.5`} />
                        </div>
                        {newMilestone.title === "Custom" && (
                          <input value={newMilestone.customTitle}
                            onChange={e => setNewMilestone(nm => ({ ...nm, customTitle: e.target.value }))}
                            placeholder="Custom stage name" className={`${inpCls} text-xs py-1.5`} />
                        )}
                        <input value={newMilestone.note}
                          onChange={e => setNewMilestone(nm => ({ ...nm, note: e.target.value }))}
                          placeholder="Note (optional)" className={`${inpCls} text-xs py-1.5`} />
                        <input type="file" accept="image/*"
                          onChange={e => setMilestonePhoto(e.target.files?.[0] ?? null)}
                          className="text-[10px] text-gray-500 w-full" />
                        <button
                          onClick={addMilestone}
                          disabled={savingConstruction}
                          className="w-full py-2 rounded-lg text-xs font-semibold text-navy transition-all disabled:opacity-50"
                          style={{ background: "var(--gold)" }}
                        >
                          {savingConstruction ? "Saving…" : "Add Milestone"}
                        </button>
                      </div>
                    </div>

                    {/* Approve / Reject */}
                    {reviewing.status === "pending" && (
                      <div className="space-y-3 border-t border-gray-200 pt-4">
                        <button onClick={() => doAction("approve")} disabled={acting}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-navy text-sm transition-all disabled:opacity-50"
                          style={{ background: "#22c55e" }}>
                          {acting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                          Approve & Go Live
                        </button>
                        <div className="space-y-2">
                          <textarea value={rejectMsg} onChange={e => setRejectMsg(e.target.value)} rows={2}
                            className={`${inpCls} resize-none`} placeholder="Rejection reason (required)…" />
                          <button onClick={() => doAction("reject")} disabled={acting || !rejectMsg.trim()}
                            className="w-full py-2.5 rounded-xl font-semibold text-sm border border-red-700 text-red-600 hover:bg-red-900/30 transition-all disabled:opacity-40">
                            Reject
                          </button>
                        </div>
                      </div>
                    )}

                    {reviewing.status === "approved" && (
                      <div className="border-t border-gray-200 pt-4">
                        <div className="bg-green-900/30 border border-green-800 rounded-xl p-3 text-center">
                          <CheckCircle size={16} className="mx-auto mb-1 text-green-600" />
                          <p className="text-green-600 text-xs font-semibold">Live on Buy page</p>
                          <a href="/buy" target="_blank" className="text-xs text-green-600 underline mt-1 inline-block">View →</a>
                        </div>
                        <button onClick={() => doAction("reject")} disabled={acting}
                          className="mt-3 w-full py-2 rounded-xl text-sm border border-red-800 text-red-600 hover:bg-red-900/30 transition-all disabled:opacity-40">
                          Revoke Approval
                        </button>
                      </div>
                    )}

                    {reviewing.status === "rejected" && reviewing.rejectReason && (
                      <div className="border-t border-gray-200 pt-4">
                        <div className="bg-red-900/20 border border-red-800 rounded-xl p-3">
                          <p className="text-red-600 text-xs font-semibold mb-1">Rejection reason</p>
                          <p className="text-gray-700 text-xs">{reviewing.rejectReason}</p>
                        </div>
                        <button onClick={() => doAction("approve")} disabled={acting}
                          className="mt-3 w-full py-2.5 rounded-xl font-semibold text-navy text-sm transition-all disabled:opacity-50"
                          style={{ background: "#22c55e" }}>
                          Re-approve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const ADMIN_TAB_KEYS = ["aiBrain", "quickAdd", "properties", "leads", "settings", "submissions"] as const;
type AdminTabKey = (typeof ADMIN_TAB_KEYS)[number];

function AdminDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = ADMIN_TAB_KEYS.includes(searchParams.get("tab") as AdminTabKey)
    ? (searchParams.get("tab") as AdminTabKey)
    : "aiBrain";
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [scoringId, setScoringId]   = useState<string | null>(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [propTab, setPropTab]       = useState<"pending" | "approved">("pending");
  const [adminTab, setAdminTab]     = useState<AdminTabKey>(initialTab);
  const [adminLeads, setAdminLeads] = useState<{ id:string; name:string; phone:string; email?:string; message?:string; source:string; status:string; createdAt:string }[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [docFiles, setDocFiles]         = useState<DocFile[]>([]);
  const [docDragging, setDocDragging]   = useState(false);
  const [viewDocsFor, setViewDocsFor]   = useState<Property | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/properties?status=${propTab === "pending" ? "pending" : "approved"}&limit=50`);
      const data = await res.json();
      setProperties(data.properties ?? []);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminLeads = async () => {
    setLeadsLoading(true);
    try {
      const res  = await fetch("/api/leads");
      const data = await res.json();
      setAdminLeads(Array.isArray(data) ? data : []);
    } catch { setAdminLeads([]); }
    finally   { setLeadsLoading(false); }
  };

  useEffect(() => { if (adminTab === "properties") fetchProperties(); }, [propTab, adminTab]);
  useEffect(() => { if (adminTab === "leads") fetchAdminLeads(); }, [adminTab]);

  const handleApprove = async (id: string) => {
    await fetch(`/api/properties/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    fetchProperties();
  };

  const handleReject = async (id: string) => {
    await fetch(`/api/properties/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    fetchProperties();
  };

  // Property Inventory AI scores (Section 5 / Q) -- calls the real AI Intelligence engine +
  // Legal Shield, same as everywhere else in the app. Manually triggered per property.
  const runScore = async (id: string) => {
    setScoringId(id);
    try {
      await fetch(`/api/crm/properties/${id}/score`, { method: "POST" });
    } catch { /* honest no-op -- fetchProperties below reflects whatever actually got saved */ }
    setScoringId(null);
    fetchProperties();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this property?")) return;
    await fetch(`/api/properties/${id}`, { method: "DELETE" });
    fetchProperties();
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload  = () => res((r.result as string).split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const addDocFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f =>
      ["application/pdf","image/jpeg","image/png","image/jpg"].includes(f.type)
    );
    const MAX = 5 * 1024 * 1024; // 5 MB each
    const newDocs = await Promise.all(arr.map(async f => {
      if (f.size > MAX) { alert(`${f.name} exceeds 5 MB limit.`); return null; }
      const data = await readFileAsBase64(f);
      return { id: `${Date.now()}-${Math.random()}`, name: f.name, type: f.type, size: f.size, data };
    }));
    setDocFiles(prev => [...prev, ...(newDocs.filter(Boolean) as DocFile[])]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          beds: form.beds ? Number(form.beds) : null,
          baths: form.baths ? Number(form.baths) : null,
          sqft: form.sqft ? Number(form.sqft) : null,
          images: [],
          amenities: [],
          documents: docFiles,
          status: "approved",
        }),
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setDocFiles([]);
      fetchProperties();
    } catch {
      alert("Failed to save property.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "admin" }) });
    router.push("/admin");
  };

  const inputCls = "bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-400 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[#D6A63E]";

  const SIDEBAR_TABS = [
    { key: "aiBrain",     label: "AI Brain",       icon: Brain },
    { key: "quickAdd",    label: "Quick Add",      icon: Zap },
    { key: "submissions", label: "Submissions",    icon: Inbox },
    { key: "properties",  label: "Properties",     icon: LayoutDashboard },
    { key: "leads",       label: "Leads",          icon: Users },
    { key: "settings",    label: "Settings",       icon: Shield },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-200">
          <PKLogo />
          <span className="text-[7px] tracking-[0.25em] mt-2 block" style={{ color: "var(--gold-text)" }}>ADMIN PORTAL</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {SIDEBAR_TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setAdminTab(key)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${adminTab === key ? "text-navy font-semibold" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}
              style={adminTab === key ? { background: "var(--gold)" } : {}}>
              <Icon size={15} /> {label}
            </button>
          ))}
          <a href="/crm/dashboard" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
            <Users size={15} /> CRM Pipeline
          </a>
          <a href="/crm/dashboard-v2" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
            <LayoutDashboard size={15} /> Executive Dashboard
          </a>
          <a href="/crm/followups" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
            <Inbox size={15} /> Follow-Ups
          </a>
          <a href="/admin/bulk-import" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
            <FileText size={15} /> Bulk Import
          </a>
          <a href="/admin/users" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
            <Shield size={15} /> Team / RBAC
          </a>
          <a href="/admin/settings" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
            <Zap size={15} /> Integrations
          </a>
          <a href="/admin/audit-log" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
            <History size={15} /> Audit Trail
          </a>
          <a href="/nri" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
            <Home size={15} /> NRI Page
          </a>
          <a href="/" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
            <Home size={15} /> View Website
          </a>
        </nav>
        <div className="p-3 border-t border-gray-200">
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-400 transition-colors">
            <LogOut size={15} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-end px-6 pt-4 pb-0 shrink-0">
          <NotificationBell />
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
        {adminTab === "aiBrain"     && <AiBrainTab />}
        {adminTab === "quickAdd"    && <QuickAddTab />}
        {adminTab === "submissions" && <SubmissionsTab />}

        {adminTab === "leads" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-playfair text-xl font-bold text-gray-900">All Leads</h1>
              <button onClick={fetchAdminLeads} className="text-gray-500 hover:text-gray-900 text-sm border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                Refresh
              </button>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      {["Name","Phone","Email","Source","Status","Date","WhatsApp"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leadsLoading ? (
                      <tr><td colSpan={7} className="text-center py-10 text-gray-500"><Loader2 size={20} className="mx-auto animate-spin" /></td></tr>
                    ) : adminLeads.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-10 text-gray-500">No leads yet. Leads from all forms appear here.</td></tr>
                    ) : adminLeads.map(l => {
                      const leadWaLink = `https://wa.me/${toIndianWaNumber(l.phone)}?text=${encodeURIComponent(`Hi ${l.name}, this is Raghu from PropKnown. How can I help you?`)}`;
                      const notifyWaLink = `https://wa.me/917013016003?text=${encodeURIComponent(
                        [`New PropKnown lead:`, `Name: ${l.name}`, `Phone: ${l.phone}`, l.email ? `Email: ${l.email}` : null, `Source: ${l.source}`, l.message ? `Enquiry: ${l.message}` : null]
                          .filter(Boolean).join("\n")
                      )}`;
                      return (
                      <tr key={l.id} className="hover:bg-gray-100 transition-colors">
                        <td className="px-4 py-3 text-gray-900 font-medium">{l.name}</td>
                        <td className="px-4 py-3"><a href={`tel:${l.phone}`} className="text-[#D6A63E] hover:underline">{l.phone}</a></td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{l.email ?? "—"}</td>
                        <td className="px-4 py-3"><span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{l.source}</span></td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.status==="won"?"bg-green-900 text-green-400":l.status==="lost"?"bg-red-900 text-red-400":"bg-gray-100 text-gray-700"}`}>{l.status}</span></td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{new Date(l.createdAt).toLocaleDateString("en-IN")}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <a href={leadWaLink} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-300 text-xs font-medium mr-3">Message Lead</a>
                          <a href={notifyWaLink} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-400 text-xs font-medium">Notify Raghu</a>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {adminTab === "settings" && (
          <div className="max-w-2xl space-y-6">
            <h1 className="font-playfair text-xl font-bold text-gray-900 mb-6">Settings</h1>
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
              <h2 className="font-playfair text-gray-900 font-semibold text-sm uppercase tracking-wider border-b border-gray-200 pb-3">Business Info</h2>
              {[
                { label: "Company", value: "PropKnown Infra Pvt Ltd" },
                { label: "Founder", value: "Pinnelli Raghu Kiran" },
                { label: "WhatsApp", value: "+91 70130 16003" },
                { label: "Email", value: "kiranpropservices@gmail.com" },
                { label: "Address", value: "Shop No 3, Venkateswara Nilyam, Nizampet Road, Hyd 500090" },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-4">
                  <span className="text-gray-500 text-sm w-28 shrink-0">{label}</span>
                  <span className="text-gray-800 text-sm">{value}</span>
                </div>
              ))}
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
              <h2 className="font-playfair text-gray-900 font-semibold text-sm uppercase tracking-wider border-b border-gray-200 pb-3">API Status</h2>
              {[
                { label: "Gemini AI (KnownAI)", status: true,  note: "gemini-2.5-flash-lite" },
                { label: "Resend (Email)",     status: true,  note: "raghupinnelli@gmail.com" },
                { label: "Database (Neon)",    status: true,  note: "PostgreSQL connected" },
                { label: "Anthropic (AI Brain)",status:false, note: "Add ANTHROPIC_API_KEY to enable" },
              ].map(({ label, status, note }) => (
                <div key={label} className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${status ? "bg-green-400" : "bg-yellow-500"}`} />
                  <span className="text-gray-700 text-sm w-44 shrink-0">{label}</span>
                  <span className={`text-xs ${status ? "text-gray-500" : "text-yellow-500"}`}>{note}</span>
                </div>
              ))}
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="font-playfair text-gray-900 font-semibold text-sm uppercase tracking-wider border-b border-gray-200 pb-3 mb-4">Quick Links</h2>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: "View Website",    href: "/" },
                  { label: "CRM Pipeline",    href: "/crm/dashboard" },
                  { label: "AI Intelligence", href: "/ai-intelligence" },
                  { label: "Buy Page",        href: "/buy" },
                ].map(({ label, href }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                    className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:border-[#D6A63E] hover:text-gray-900 transition-all">
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {adminTab === "properties" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-playfair text-xl font-bold text-gray-900">Property Management</h1>
              <button onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 text-navy text-sm font-semibold px-4 py-2 rounded-lg transition-all"
                style={{ background: "var(--gold)" }}>
                <Plus size={16} /> Add Property
              </button>
            </div>

            {showForm && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                <h2 className="font-playfair text-gray-900 font-semibold mb-4">New Property</h2>
                <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="col-span-full">
                    <label className="text-gray-500 text-xs mb-1 block">Title *</label>
                    <input className={inputCls} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Property title" />
                  </div>
                  {[
                    { label: "Location", key: "location", placeholder: "Gachibowli" },
                    { label: "City", key: "city", placeholder: "Hyderabad" },
                    { label: "State", key: "state", placeholder: "Telangana" },
                    { label: "Price", key: "price", placeholder: "9500000", type: "number" },
                    { label: "Beds", key: "beds", placeholder: "3", type: "number" },
                    { label: "Baths", key: "baths", placeholder: "2", type: "number" },
                    { label: "Sqft", key: "sqft", placeholder: "1850", type: "number" },
                    { label: "RERA No.", key: "reraNumber", placeholder: "P02400..." },
                  ].map(({ label, key, placeholder, type }) => (
                    <div key={key}>
                      <label className="text-gray-500 text-xs mb-1 block">{label}</label>
                      <input className={inputCls} type={type ?? "text"} value={(form as Record<string, unknown>)[key] as string} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} />
                    </div>
                  ))}
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Property Type</label>
                    <select className={inputCls} value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })}>
                      {["apartment","villa","penthouse","commercial","plot"].map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Listing Type</label>
                    <select className={inputCls} value={form.listingType} onChange={(e) => setForm({ ...form, listingType: e.target.value })}>
                      <option value="sale">For Sale</option>
                      <option value="rent">For Rent</option>
                    </select>
                  </div>
                  <div className="col-span-full border-t border-gray-200 pt-4">
                    <p className="text-gray-500 text-xs font-semibold mb-3 uppercase tracking-wider flex items-center gap-2">
                      <Shield size={13} style={{ color: "var(--gold)" }} /> Approval Checklist
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: "reraVerified", label: "RERA Verified" },
                        { key: "realPhotos", label: "Real Photos Confirmed" },
                        { key: "accuratePrice", label: "Price is Accurate" },
                        { key: "ownerConsent", label: "Owner Consent Obtained" },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={(form as Record<string, unknown>)[key] as boolean}
                            onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="w-4 h-4" style={{ accentColor: "var(--gold)" }} />
                          <span className="text-gray-700 text-sm">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* Document Upload */}
                  <div className="col-span-full border-t border-gray-200 pt-4">
                    <p className="text-gray-500 text-xs font-semibold mb-3 uppercase tracking-wider flex items-center gap-2">
                      <FileText size={13} style={{ color: "var(--gold)" }} /> Documents (RERA Certificate, Title Deed, Brochure, Floor Plan)
                    </p>
                    <div
                      onDragOver={e => { e.preventDefault(); setDocDragging(true); }}
                      onDragLeave={() => setDocDragging(false)}
                      onDrop={e => { e.preventDefault(); setDocDragging(false); addDocFiles(e.dataTransfer.files); }}
                      onClick={() => docInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl px-6 py-8 text-center cursor-pointer transition-all ${docDragging ? "border-[#D6A63E] bg-[#D6A63E]/10" : "border-gray-200 hover:border-gray-300"}`}
                    >
                      <FileText size={24} className="mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-500 text-sm">Drag &amp; drop files here, or <span style={{ color: "var(--gold)" }}>Choose Files</span></p>
                      <p className="text-gray-400 text-xs mt-1">PDF, JPG, PNG Â· Max 5 MB each</p>
                    </div>
                    <input
                      ref={docInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => { if (e.target.files) addDocFiles(e.target.files); e.target.value = ""; }}
                    />
                    {docFiles.length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {docFiles.map(doc => (
                          <li key={doc.id} className="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText size={13} className="text-gray-500 shrink-0" />
                              <span className="text-gray-700 text-xs truncate">{doc.name}</span>
                              <span className="text-gray-400 text-[10px] shrink-0">({(doc.size / 1024).toFixed(0)} KB)</span>
                            </div>
                            <button type="button" onClick={() => setDocFiles(d => d.filter(x => x.id !== doc.id))}
                              className="text-gray-400 hover:text-red-400 ml-2 transition-colors shrink-0">
                              <XCircle size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="col-span-full flex gap-3 pt-2">
                    <button type="submit" disabled={saving} className="text-navy text-sm font-semibold px-6 py-2 rounded-lg disabled:opacity-60" style={{ background: "var(--gold)" }}>
                      {saving ? "Saving..." : "Save Property"}
                    </button>
                    <button type="button" onClick={() => { setShowForm(false); setDocFiles([]); }} className="border border-gray-200 text-gray-500 text-sm px-4 py-2 rounded-lg hover:text-gray-900">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="flex gap-2 mb-4">
              {(["pending", "approved"] as const).map((t) => (
                <button key={t} onClick={() => setPropTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${propTab === t ? "text-navy" : "bg-gray-100 text-gray-500 hover:text-gray-900"}`}
                  style={propTab === t ? { background: "var(--gold)" } : {}}>
                  {t}
                </button>
              ))}
            </div>

            {/* Document Viewer Modal */}
            {viewDocsFor && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setViewDocsFor(null)}>
                <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-playfair text-gray-900 font-semibold">Documents</h3>
                      <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{viewDocsFor.title}</p>
                    </div>
                    <button onClick={() => setViewDocsFor(null)} className="text-gray-500 hover:text-gray-900 transition-colors"><XCircle size={18} /></button>
                  </div>
                  <ul className="space-y-2 max-h-80 overflow-y-auto">
                    {((viewDocsFor.documents ?? []) as DocFile[]).map(doc => (
                      <li key={doc.id} className="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={14} className="text-[#D6A63E] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-gray-800 text-sm truncate">{doc.name}</p>
                            <p className="text-gray-400 text-[10px]">{(doc.size / 1024).toFixed(0)} KB Â· {doc.type}</p>
                          </div>
                        </div>
                        <a
                          href={`data:${doc.type};base64,${doc.data}`}
                          download={doc.name}
                          className="ml-3 shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                          style={{ background: "rgba(214,166,62,0.15)", color: "var(--gold)", border: "1px solid rgba(214,166,62,0.4)" }}
                        >
                          Download
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      {["Property", "City", "Price", "Checklist", "AI Score", "Actions"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan={6} className="text-center py-10 text-gray-500">Loading...</td></tr>
                    ) : properties.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-10 text-gray-500">No {propTab} properties found.</td></tr>
                    ) : properties.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-100 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-gray-900 font-medium line-clamp-1">{p.title}</p>
                          <p className="text-gray-500 text-xs">{p.location}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{p.city}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: "var(--gold)" }}>{formatPrice(p.price, p.currency)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {[p.reraVerified, p.realPhotos, p.accuratePrice, p.ownerConsent].map((v, i) => (
                              <span key={i} className={`w-5 h-5 rounded-full flex items-center justify-center ${v ? "bg-green-900 text-green-400" : "bg-gray-100 text-gray-400"}`}>
                                {v ? <CheckCircle size={12} /> : <XCircle size={12} />}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {p.aiScore != null ? (
                            <div className="text-xs">
                              <p className="text-gray-900 font-semibold">{p.aiScore}/10</p>
                              {p.legalScore != null && <p className="text-gray-500">Legal: {p.legalScore}/100</p>}
                            </div>
                          ) : (
                            <button onClick={() => runScore(p.id)} disabled={scoringId === p.id}
                              className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-[#D6A63E] disabled:opacity-50">
                              {scoringId === p.id ? "Scoring…" : "Score"}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            {propTab === "pending" && (
                              <button onClick={() => handleApprove(p.id)} className="bg-green-900/50 border border-green-700 text-green-400 text-xs px-3 py-1.5 rounded-lg hover:bg-green-800 transition-all">
                                Approve
                              </button>
                            )}
                            <button onClick={() => handleReject(p.id)} className="bg-red-900/30 border border-red-800 text-red-400 text-xs px-3 py-1.5 rounded-lg hover:bg-red-900 transition-all">
                              Reject
                            </button>
                            {p.documents && (p.documents as DocFile[]).length > 0 && (
                              <button onClick={() => setViewDocsFor(p)}
                                className="bg-gray-100 border border-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded-lg hover:border-[#D6A63E] hover:text-[#D6A63E] transition-all flex items-center gap-1">
                                <FileText size={11} /> {(p.documents as DocFile[]).length} Doc{(p.documents as DocFile[]).length > 1 ? "s" : ""}
                              </button>
                            )}
                            <button onClick={() => handleDelete(p.id)} className="text-gray-500 hover:text-red-400 transition-colors p-1.5">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        </div>
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <AdminDashboardInner />
    </Suspense>
  );
}
